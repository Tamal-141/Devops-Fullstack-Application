import { Link } from 'react-router';

export default function NotFound() {
  return (
    <section className="py-16 text-center">
      <p className="bg-linear-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-7xl font-extrabold text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <Link to="/" className="mt-6 inline-block font-medium text-indigo-600 hover:underline">
        Back to products
      </Link>
    </section>
  );
}
