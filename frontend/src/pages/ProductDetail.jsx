import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.js';
import { useApi } from '../hooks/useApi.js';
import { formatPrice } from '../format.js';
import ErrorBox from '../components/ErrorBox.jsx';
import ProductTile from '../components/ProductTile.jsx';

const QUANTITIES = Array.from({ length: 10 }, (_, i) => i + 1);

export default function ProductDetail() {
  const { id } = useParams();
  const { loading, data, error } = useApi(`/products/${id}`);
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState(null);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) {
    return (
      <section>
        <ErrorBox message={error.status === 404 ? 'That product does not exist.' : error.message} />
        <BackLink />
      </section>
    );
  }

  const { product } = data;

  async function placeOrder() {
    if (!user) {
      // Come back to this product after logging in.
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setPlacing(true);
    setOrderError(null);
    try {
      const { order } = await api('/orders', { method: 'POST', token, body: { productId: product.id, quantity } });
      navigate('/order-confirmed', { state: { order } });
    } catch (err) {
      if (err.status === 401) {
        // Token expired or invalid: drop the stale session and ask for a fresh login.
        logout();
        navigate('/login', { state: { from: location.pathname, message: err.message } });
        return;
      }
      setOrderError(err.message);
      setPlacing(false);
    }
  }

  return (
    <section>
      <BackLink />
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <ProductTile product={product} large />
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-2xl font-semibold text-indigo-600">{formatPrice(product.priceCents)}</p>
          <p className="mt-4 leading-relaxed text-slate-600">{product.description}</p>

          <div className="mt-6 flex items-end gap-3">
            <label className="text-sm font-medium" htmlFor="quantity">
              Quantity
              <select
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                {QUANTITIES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={placeOrder}
              disabled={placing}
              className="rounded-md bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {!user ? 'Log in to order' : placing ? 'Placing order…' : 'Place order'}
            </button>
          </div>
          {user && <p className="mt-2 text-sm text-slate-500">Total: {formatPrice(product.priceCents * quantity)}</p>}
          {orderError && <ErrorBox message={orderError} />}
        </div>
      </div>
    </section>
  );
}

function BackLink() {
  return (
    <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
      ← All products
    </Link>
  );
}
