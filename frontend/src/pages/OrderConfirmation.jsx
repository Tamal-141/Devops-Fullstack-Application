import { Link, useLocation } from 'react-router';
import { formatPrice } from '../format.js';

// The order arrives as navigation state from ProductDetail. A refresh loses that state
// (there is no order-history endpoint), so that case gets a plain fallback.
export default function OrderConfirmation() {
  const order = useLocation().state?.order;

  if (!order) {
    return (
      <section>
        <p className="text-slate-600">No recent order to show.</p>
        <Link to="/" className="mt-4 inline-block font-medium text-indigo-600 hover:underline">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-emerald-700">Order placed</h1>
      <p className="mt-1 text-slate-500">Order #{order.id}</p>
      <dl className="mt-6 space-y-2 text-sm">
        <Row label="Product" value={order.productName} />
        <Row label="Quantity" value={order.quantity} />
        <Row label="Unit price" value={formatPrice(order.unitPriceCents)} />
        <Row label="Total" value={formatPrice(order.totalCents)} strong />
      </dl>
      <Link to="/" className="mt-6 inline-block font-medium text-indigo-600 hover:underline">
        Continue shopping
      </Link>
    </section>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'font-semibold' : ''}>{value}</dd>
    </div>
  );
}
