import React, { useState } from 'react';
import { Activity, UserPlus, Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onSelectAccount,
  loading,
  role = 'PATIENT'
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  // Real primary Google accounts for 1-click instant login
  const accounts = [
    {
      name: 'Abhishek Choudhary',
      email: 'choudharyabhishek656@gmail.com',
      avatar: 'https://lh3.googleusercontent.com/a/default-user',
      initials: 'AC',
      color: 'bg-emerald-600'
    },
    {
      name: 'Abhishek Choudhary',
      email: 'abhishek.23bce8137@vitapstudent.ac.in',
      avatar: null,
      initials: 'A',
      color: 'bg-indigo-600'
    }
  ];

  const handleAccountClick = (account) => {
    const nameParts = account.name.split(' ');
    onSelectAccount({
      email: account.email.trim().toLowerCase(),
      firstName: nameParts[0] || 'Abhishek',
      lastName: nameParts.slice(1).join(' ') || 'Choudhary',
      avatar: account.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=0D9488&color=fff`,
      googleId: `google-${account.email.replace(/[^a-zA-Z0-9]/g, '')}`,
      role: role
    });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) return;
    const nameParts = (customName.trim() || customEmail.split('@')[0]).split(' ');
    onSelectAccount({
      email: customEmail.trim().toLowerCase(),
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameParts.join(' '))}&background=0D9488&color=fff`,
      googleId: `google-${Date.now()}`,
      role: role
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] rounded-3xl bg-[#111622] text-white border border-slate-800 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-sm font-bold text-slate-200">Sign in with Google</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Choose an account</h2>
              <p className="text-xs text-slate-400">to continue to <span className="font-semibold text-teal-400">HealthSync</span></p>
            </div>
          </div>

          {!customMode ? (
            <div className="space-y-2.5">
              {accounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAccountClick(acc)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#182030] hover:bg-[#202b40] border border-slate-700/60 hover:border-teal-500/50 transition-all text-left group cursor-pointer"
                >
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow", acc.color)}>
                    {acc.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-teal-300 transition-colors">
                      {acc.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{acc.email}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-[#182030] border border-transparent hover:border-slate-700/60 text-left transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Use another Google account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to accounts
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#182030] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Google Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-[#182030] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Continue to HealthSync'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="mt-6 pt-3.5 border-t border-slate-800/80 text-[10px] text-slate-400 text-center leading-relaxed">
            To continue, Google will share your name and email with HealthSync.
          </div>
        </div>
      </div>
    </div>
  );
}
