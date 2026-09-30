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

  if (loading) {
    return (
      <div className="grid animate-pulse gap-8 md:grid-cols-2" aria-busy="true">
        <div className="h-72 rounded-xl bg-slate-200" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-6 w-24 rounded bg-slate-200" />
          <div className="h-20 rounded bg-slate-100" />
        </div>
      </div>
    );
  }
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
      <div className="mt-4 grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <ProductTile product={product} large />
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold">{product.name}</h1>
          <p className="mt-3">
            <span className="rounded-full bg-indigo-50 px-4 py-1.5 text-xl font-bold text-indigo-700">
              {formatPrice(product.priceCents)}
            </span>
          </p>
          <p className="mt-5 leading-relaxed text-slate-600">{product.description}</p>

          <div className="mt-auto pt-8">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium text-slate-700" htmlFor="quantity">
                Quantity
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                className="flex-1 rounded-lg bg-linear-to-r from-indigo-600 to-violet-600 px-6 py-2.5 font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110 disabled:opacity-60"
              >
                {!user ? 'Log in to order' : placing ? 'Placing order…' : 'Place order'}
              </button>
            </div>
            {user && (
              <p className="mt-3 text-sm text-slate-500">
                Total: <span className="font-semibold text-slate-800">{formatPrice(product.priceCents * quantity)}</span>
              </p>
            )}
            {orderError && <ErrorBox message={orderError} />}
          </div>
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
