const express = require('express');
const { z } = require('zod');
const { AppError } = require('../errors');

const params = z.object({ id: z.coerce.number().int().positive() });

const toProduct = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  priceCents: row.price_cents,
});

function productsRouter({ pool }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const [rows] = await pool.query('SELECT id, slug, name, description, price_cents FROM products ORDER BY id');
    res.json({ products: rows.map(toProduct) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = params.parse(req.params);
    const [rows] = await pool.query('SELECT id, slug, name, description, price_cents FROM products WHERE id = ?', [id]);
    if (rows.length === 0) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    res.json({ product: toProduct(rows[0]) });
  });

  return router;
}

module.exports = { productsRouter };
