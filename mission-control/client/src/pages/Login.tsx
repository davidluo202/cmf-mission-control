import { useState } from 'react';
import { Activity, Lock, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { password });
      if (res.data.ok) {
        sessionStorage.setItem('mc_authed', '1');
        sessionStorage.setItem('mc_token', res.data.token);
        onLogin(res.data.token);
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mb-3">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Mission Control</h1>
          <p className="text-sm text-gray-500 mt-1">Canton Financial AI Team</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter password"
              autoFocus
              disabled={loading}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">Internal use only · CMF Team</p>
      </div>
    </div>
  );
}
