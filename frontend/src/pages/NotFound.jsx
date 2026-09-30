import { Link } from 'react-router';

export default function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block font-medium text-indigo-600 hover:underline">
        Back to products
      </Link>
    </section>
  );
}
