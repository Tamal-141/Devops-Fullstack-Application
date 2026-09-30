// Products have no images (nothing to host, nothing to break). A coloured tile with
// the product's initials stands in. Full class names, not built from pieces, so
// Tailwind's scanner can find them in the source.
const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-slate-600 to-slate-800',
];

export default function ProductTile({ product, large = false }) {
  const initials = product.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-lg bg-linear-to-br font-bold text-white ${
        GRADIENTS[product.id % GRADIENTS.length]
      } ${large ? 'h-64 text-6xl' : 'h-32 text-3xl'}`}
    >
      {initials}
    </div>
  );
}
