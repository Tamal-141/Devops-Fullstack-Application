import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.js';
import ErrorBox from '../components/ErrorBox.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Where to go after logging in, and why we were sent here (e.g. session expired).
  const from = location.state?.from ?? '/';
  const notice = location.state?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const input =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

  return (
    <section className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Use the demo account — <code className="text-xs">SEED_USER_EMAIL</code> / <code className="text-xs">SEED_USER_PASSWORD</code> in{' '}
        <code className="text-xs">.env</code>.
      </p>
      {notice && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">
          Password
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-2.5 font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      {error && <ErrorBox message={error} />}
    </section>
  );
}
