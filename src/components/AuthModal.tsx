import React, { useState } from 'react';
import { User, X, LogIn, UserPlus, ShieldCheck, Mail, Lock, Phone, MapPin, KeyRound, Sparkles } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  allUsers: UserType[];
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess, allUsers }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('AdminStaff');
  const [loginPassword, setLoginPassword] = useState('adminstaff123@');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({
        username: loginIdentifier,
        email: loginIdentifier,
        password: loginPassword,
      });
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({ fullName, email, phone, address });
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: UserType) => {
    onLoginSuccess(u);
    onClose();
  };

  const fillAdminCredentials = () => {
    setLoginIdentifier('AdminStaff');
    setLoginPassword('adminstaff123@');
    setError(null);
  };

  const adminUser = allUsers.find((u) => u.username === 'AdminStaff' || u.role === 'Admin') || allUsers[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              {mode === 'login' ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {mode === 'login' ? 'System Login' : 'Create New Account'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'login' ? 'For Administrators (AdminStaff) & Adopters' : 'Create a prospective adopter profile'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register
          </button>
        </div>



        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-2 animate-in fade-in">
            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode: Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Username or Email:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  placeholder="AdminStaff or user email..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  placeholder="adminstaff123@"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 mt-1 flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>

            {/* Other Demo User Accounts */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Or quick login as prospective adopter:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {allUsers
                  .filter((u) => u.role === 'Adopter')
                  .slice(0, 2)
                  .map((u) => (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-left flex items-center gap-2 transition-colors"
                    >
                      <img src={u.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                      <div className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {u.fullName}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </form>
        )}

        {/* Mode: Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                placeholder="john.doe@example.com"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number:</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  placeholder="+1 (555) 019-2834"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address / City:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Profile...' : 'Register Profile (USERS Table)'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
