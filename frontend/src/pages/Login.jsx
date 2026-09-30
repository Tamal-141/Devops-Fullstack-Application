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

  const input = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2';

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Log in</h1>
      {notice && <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium" htmlFor="email">
          Email
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="block text-sm font-medium" htmlFor="password">
          Password
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      {error && <ErrorBox message={error} />}
    </section>
  );
}
