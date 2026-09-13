import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { adminAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both admin email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminAPI.login(email.trim(), password);

      localStorage.setItem('nexis_admin_token', res.data.token);
      localStorage.setItem('nexis_admin_user', JSON.stringify(res.data.admin));

      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0F1713] text-[#212529] dark:text-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full mx-auto px-4 flex justify-end mb-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-14 h-14 bg-[#EAF7EF] dark:bg-[#1C2E26] border border-[#C8E8D5] dark:border-[#294337] text-[#198754] dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#146C43] dark:text-emerald-400">
          Admin Portal
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Sign in to access assessment results and candidate analytics
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-[#16231D] py-8 px-6 sm:px-10 shadow-soft dark:shadow-dark-soft rounded-2xl border border-gray-200 dark:border-[#294337]">
          {error && (
            <div className="mb-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/50 dark:bg-[#1C2E26] border border-gray-200 dark:border-[#294337] rounded-xl text-sm transition-all focus:bg-white dark:focus:bg-[#1C2E26] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#198754]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/50 dark:bg-[#1C2E26] border border-gray-200 dark:border-[#294337] rounded-xl text-sm transition-all focus:bg-white dark:focus:bg-[#1C2E26] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#198754]"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#198754] hover:bg-[#146C43] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:bg-gray-400"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
