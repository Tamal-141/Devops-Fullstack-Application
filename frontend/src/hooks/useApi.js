import { useEffect, useState } from 'react';
import { api } from '../api.js';

// GET `path` and track the result. The result remembers which path it belongs to, so
// when `path` changes (e.g. product 1 → product 2) we are "loading" again straight
// away, without showing the previous product for a moment.
export function useApi(path) {
  const [result, setResult] = useState({ path: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    api(path).then(
      (data) => {
        if (!cancelled) setResult({ path, data, error: null });
      },
      (error) => {
        if (!cancelled) setResult({ path, data: null, error });
      },
    );
    // A response that arrives after the user navigated away is ignored.
    return () => {
      cancelled = true;
    };
  }, [path]);

  const loading = result.path !== path;
  return { loading, data: loading ? null : result.data, error: loading ? null : result.error };
}
