const express = require('express');
const { z } = require('zod');
const { AppError } = require('../errors');
const { requireAuth } = require('../middleware/requireAuth');

// Unknown keys (like a client-sent price) are stripped by zod and never reach the query.
const orderBody = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10),
});

function ordersRouter({ pool, config }) {
  const router = express.Router();

  router.post('/', requireAuth(config), async (req, res) => {
    const { productId, quantity } = orderBody.parse(req.body);

    const [products] = await pool.query('SELECT id, name, price_cents FROM products WHERE id = ?', [productId]);
    const product = products[0];
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

    // The price comes from the database, never from the request.
    const totalCents = product.price_cents * quantity;
    const [result] = await pool.query(
      'INSERT INTO orders (user_id, product_id, quantity, unit_price_cents, total_cents) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, product.id, quantity, product.price_cents, totalCents],
    );

    res.status(201).json({
      order: {
        id: result.insertId,
        productId: product.id,
        productName: product.name,
        quantity,
        unitPriceCents: product.price_cents,
        totalCents,
      },
    });
  });

  return router;
}

module.exports = { ordersRouter };
