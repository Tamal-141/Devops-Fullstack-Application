import { Link } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { formatPrice } from '../format.js';
import ErrorBox from '../components/ErrorBox.jsx';
import ProductTile from '../components/ProductTile.jsx';

export default function ProductList() {
  const { loading, data, error } = useApi('/products');

  return (
    <section>
      <h1 className="text-2xl font-bold">Products</h1>

      {loading && <p className="mt-6 text-slate-500">Loading products…</p>}
      {error && <ErrorBox message={error.message} />}

      {data && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.products.map((product) => (
            <li key={product.id}>
              <Link
                to={`/products/${product.id}`}
                data-testid="product-card"
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <ProductTile product={product} />
                <h2 className="mt-3 font-semibold">{product.name}</h2>
                <p className="mt-1 font-medium text-indigo-600">{formatPrice(product.priceCents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
