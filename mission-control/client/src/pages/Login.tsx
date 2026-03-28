import { useState } from 'react';
import { Activity, Lock, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api';

const MAX_ATTEMPTS = 5;

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const remaining = MAX_ATTEMPTS - attempts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading || locked) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { password });
      if (res.data?.ok) {
        sessionStorage.setItem('mc_authed', '1');
        sessionStorage.setItem('mc_token', res.data.token);
        onLogin(res.data.token);
        return;
      }
      // Shouldn't happen (non-2xx throws), but handle gracefully
      throw new Error('Invalid password');
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPassword('');

      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setError('Too many failed attempts. Access locked.');
      } else {
        const left = MAX_ATTEMPTS - newAttempts;
        setError(`Incorrect password. ${left} attempt${left !== 1 ? 's' : ''} remaining.`);
      }
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

        {locked ? (
          <div className="text-center py-4">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-600">Access Locked</p>
            <p className="text-xs text-gray-500 mt-1">Too many failed attempts. Please contact your administrator.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoFocus
                disabled={loading || locked}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm disabled:opacity-50 ${
                  error ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {attempts > 0 && !error && (
              <p className="text-xs text-gray-400 text-center">{remaining} attempt{remaining !== 1 ? 's' : ''} remaining</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim() || locked}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Sign In'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">Internal use only · CMF Team</p>
      </div>
    </div>
  );
}
