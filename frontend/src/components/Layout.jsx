import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.js';
import { useApi } from '../hooks/useApi.js';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Shop<span className="text-indigo-600">Lite</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <span className="text-slate-600">Hi, {user.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700">
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

// Shows which backend build is live and whether its database answers — the same
// /api/health the deploy pipeline checks, visible to anyone looking at the page.
function Footer() {
  const { data, error } = useApi('/health');
  const version = data?.version ?? '…';
  const db = data ? data.db : error ? 'down' : '…';

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${db === 'up' ? 'bg-emerald-500' : db === 'down' ? 'bg-rose-500' : 'bg-slate-300'}`} />
        <span data-testid="api-status">
          API {version} · database {db}
        </span>
      </div>
    </footer>
  );
}
