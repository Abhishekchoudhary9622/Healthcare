import React, { useState } from 'react';
import { Activity, UserPlus, Check, X, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GoogleAuthModal({ isOpen, onClose, onSelectAccount, loading }) {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  // Preset accounts matching user's Google ecosystem
  const presetAccounts = [
    {
      name: 'Abhishek Choudhary',
      email: 'choudharyabhishek656@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      initials: 'AC',
      color: 'bg-emerald-600'
    },
    {
      name: 'ABHISHEK CHOUDHARY 23BCE8137',
      email: 'abhishek.23bce8137@vitapstudent.ac.in',
      avatar: null,
      initials: 'A',
      color: 'bg-indigo-600'
    }
  ];

  const handleSelect = (account) => {
    onSelectAccount({
      email: account.email,
      firstName: account.name.split(' ')[0] || 'User',
      lastName: account.name.split(' ').slice(1).join(' ') || '',
      avatar: account.avatar,
      googleId: `google-${account.email.replace(/[^a-zA-Z0-9]/g, '')}`
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
      avatar: null,
      googleId: `google-${Date.now()}`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Dark theme Google Modal matching user screenshot */}
      <div className="w-full max-w-[420px] rounded-3xl bg-[#121417] text-white border border-slate-800 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Google Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {/* Google Multicolored Icon */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
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
            <span className="text-sm font-semibold text-slate-300">Sign in with Google</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* App Branding */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Choose an account</h2>
              <p className="text-xs text-slate-400">to continue to <span className="font-semibold text-emerald-400">HealthSync</span></p>
            </div>
          </div>

          {!customMode ? (
            <div className="space-y-2">
              {/* Account list */}
              {presetAccounts.map((account) => (
                <button
                  key={account.email}
                  disabled={loading}
                  onClick={() => handleSelect(account)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#1a1e24] hover:bg-[#222831] border border-slate-800 hover:border-slate-700 transition-all text-left group"
                >
                  {account.avatar ? (
                    <img src={account.avatar} alt={account.name} className="h-10 w-10 rounded-full object-cover border border-slate-700" />
                  ) : (
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white", account.color)}>
                      {account.initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                      {account.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{account.email}</p>
                  </div>
                </button>
              ))}

              {/* Use Another Account Button */}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-[#1a1e24] border border-transparent hover:border-slate-800 text-left transition-colors text-slate-300 hover:text-white"
              >
                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Use another account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to account list
              </button>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#1a1e24] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Google Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-[#1a1e24] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                {loading ? 'Authenticating...' : 'Sign in with this account'}
              </button>
            </form>
          )}

          {/* Legal / Security Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            Before using this app, you can review HealthSync's{' '}
            <span className="text-emerald-400 hover:underline cursor-pointer">Privacy Policy</span> and{' '}
            <span className="text-emerald-400 hover:underline cursor-pointer">Terms of Service</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
