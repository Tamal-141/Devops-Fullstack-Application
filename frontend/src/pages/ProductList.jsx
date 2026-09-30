import { Link } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { formatPrice } from '../format.js';
import ErrorBox from '../components/ErrorBox.jsx';
import ProductTile from '../components/ProductTile.jsx';

export default function ProductList() {
  const { loading, data, error } = useApi('/products');

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-10 text-white shadow-lg sm:px-10">
        <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <span className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <p className="relative text-sm font-semibold uppercase tracking-widest text-white/80">Desk gear</p>
        <h1 className="relative mt-2 text-3xl font-extrabold sm:text-4xl">Gear for people who ship</h1>
        <p className="relative mt-3 max-w-md text-white/90">
          Keyboards, hubs and one very patient rubber duck. Every order goes through the same pipeline you are building.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Products</h2>

        {loading && <SkeletonGrid />}
        {error && <ErrorBox message={error.message} />}

        {data && (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.products.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/products/${product.id}`}
                  data-testid="product-card"
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <ProductTile product={product} />
                  <h3 className="mt-4 font-semibold group-hover:text-indigo-700">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{product.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                      {formatPrice(product.priceCents)}
                    </span>
                    <span className="text-sm font-medium text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600">
                      View →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// Grey placeholder cards while the list loads, so the page doesn't jump around.
function SkeletonGrid() {
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-40 rounded-xl bg-slate-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-full rounded bg-slate-100" />
          <div className="mt-4 h-6 w-20 rounded-full bg-slate-200" />
        </li>
      ))}
    </ul>
  );
}
