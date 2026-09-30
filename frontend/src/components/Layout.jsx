import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.js';
import { useApi } from '../hooks/useApi.js';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <BagIcon />
            ShopLite
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="hidden text-white/90 sm:inline">Hi, {user.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-white/60 px-4 py-1.5 font-medium hover:bg-white/15"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-full bg-white px-4 py-1.5 font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1 12H6z" fill="currentColor" fillOpacity=".2" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

// Shows which backend build is live and whether its database answers — the same
// /api/health the deploy pipeline checks, visible to anyone looking at the page.
function Footer() {
  const { data, error } = useApi('/health');
  const version = data?.version ?? '…';
  const db = data ? data.db : error ? 'down' : '…';

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs">
        <span>ShopLite — a small shop for practising CI/CD</span>
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${db === 'up' ? 'bg-emerald-400' : db === 'down' ? 'bg-rose-500' : 'bg-slate-500'}`} />
          <span data-testid="api-status">
            API {version} · database {db}
          </span>
        </span>
      </div>
    </footer>
  );
}
