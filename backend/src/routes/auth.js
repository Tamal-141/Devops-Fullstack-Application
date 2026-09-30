const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');
const { AppError } = require('../errors');

const loginBody = z.object({
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  password: z.string().min(1).max(200),
});

// Compared against when the email doesn't exist, so an unknown email takes as long as a
// wrong password — response time can't be used to discover which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync('shoplite-timing-guard', 10);

function authRouter({ pool, config }) {
  const router = express.Router();

  // Counted per client IP. That only works because app.js sets `trust proxy`: without
  // it every request appears to come from nginx and all users share one limit.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many login attempts. Try again in 15 minutes.')),
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = loginBody.parse(req.body);
    const [rows] = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = ?', [email]);
    const user = rows[0];

    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    // Same message for both cases: don't tell an attacker which half was wrong.
    if (!user || !passwordOk) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

    const token = jwt.sign({ email: user.email, name: user.name }, config.JWT_SECRET, {
      subject: String(user.id),
      expiresIn: config.JWT_EXPIRES_IN,
      algorithm: 'HS256',
    });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  return router;
}

module.exports = { authRouter };
