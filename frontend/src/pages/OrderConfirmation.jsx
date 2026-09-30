import { Link, useLocation } from 'react-router';
import { formatPrice } from '../format.js';

// The order arrives as navigation state from ProductDetail. A refresh loses that state
// (there is no order-history endpoint), so that case gets a plain fallback.
export default function OrderConfirmation() {
  const order = useLocation().state?.order;

  if (!order) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">No recent order to show.</p>
        <Link to="/" className="mt-4 inline-block font-medium text-indigo-600 hover:underline">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-8 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-bold text-emerald-700">Order placed</h1>
          <p className="text-sm text-slate-500">Order #{order.id}</p>
        </div>
      </div>
      <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
        <Row label="Product" value={order.productName} />
        <Row label="Quantity" value={order.quantity} />
        <Row label="Unit price" value={formatPrice(order.unitPriceCents)} />
        <div className="border-t border-slate-200 pt-3">
          <Row label="Total" value={formatPrice(order.totalCents)} strong />
        </div>
      </dl>
      <Link
        to="/"
        className="mt-6 block rounded-lg bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-center font-semibold text-white shadow-md hover:brightness-110"
      >
        Continue shopping
      </Link>
    </section>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'text-base font-bold text-slate-900' : 'font-medium'}>{value}</dd>
    </div>
  );
}
