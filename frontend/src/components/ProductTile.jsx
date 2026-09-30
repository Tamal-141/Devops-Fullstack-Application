// Illustrations are SVG files in src/assets/products, named by product slug. Vite bundles
// them into the build (small ones are inlined), so nginx serves them with everything
// else — no image server, CDN or database column. A product added later without a
// file still gets a tile, showing its initials instead.
const ILLUSTRATIONS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/products/*.svg', { eager: true, query: '?url', import: 'default' })).map(
    ([file, url]) => [file.split('/').pop().replace(/\.svg$/, ''), url],
  ),
);

// Full class names, not built from pieces, so Tailwind's scanner can find them.
const GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-slate-600 to-slate-900',
];

export default function ProductTile({ product, large = false }) {
  const illustration = ILLUSTRATIONS[product.slug];
  const initials = product.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-linear-to-br ${
        GRADIENTS[product.id % GRADIENTS.length]
      } ${large ? 'h-72' : 'h-40'}`}
    >
      {/* Soft background circles, pure CSS. */}
      <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <span className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
      {illustration ? (
        <img src={illustration} alt="" className={`relative drop-shadow-lg ${large ? 'h-44 w-44' : 'h-24 w-24'}`} />
      ) : (
        <span className={`relative font-bold text-white ${large ? 'text-6xl' : 'text-3xl'}`}>{initials}</span>
      )}
    </div>
  );
}
