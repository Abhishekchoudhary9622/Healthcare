import React, { useState } from 'react';
import { UserPlus, X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
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

  const accounts = [
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
      color: 'bg-[#3b5998]'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#000000]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[800px] rounded-[28px] bg-[#1a1b1e] text-white border border-[#2b2c31] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Top right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-20 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 2-Column Exact Google Account Chooser (matching LeetCode Google popup) */}
        <div className="p-8 sm:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          
          {/* Left Column: Google Title & Brand */}
          <div className="md:col-span-5 flex flex-col justify-between h-full">
            <div>
              {/* Google Brand Header */}
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
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
                <span className="text-sm font-medium text-slate-300">Sign in with Google</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl font-normal text-white mt-8 tracking-tight font-sans">
                Choose an account
              </h1>
              <p className="text-sm text-slate-400 mt-3 font-sans">
                to continue to <span className="text-teal-400 font-medium">healthsync.com</span>
              </p>
            </div>

            {/* Bottom info note */}
            <div className="hidden md:block pt-12 text-xs text-slate-500 font-sans">
              Google will securely share your verified name, email address, and profile picture with HealthSync.
            </div>
          </div>

          {/* Right Column: Account List & Direct Selector */}
          <div className="md:col-span-7 flex flex-col justify-between">
            {!customMode ? (
              <div className="divide-y divide-slate-800 border-y border-slate-800">
                
                {/* Account 1 */}
                {accounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleAccountClick(acc)}
                    className="w-full flex items-center gap-4 py-4 px-3 hover:bg-[#25272d] transition-all text-left group cursor-pointer rounded-xl"
                  >
                    {acc.avatar ? (
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm text-white shrink-0", acc.color)}>
                        {acc.initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                        {acc.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5 font-sans">{acc.email}</p>
                    </div>
                  </button>
                ))}

                {/* Account 3: Use another account */}
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full flex items-center gap-4 py-4 px-3 hover:bg-[#25272d] transition-all text-left group cursor-pointer rounded-xl"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white">Use another account</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomSubmit} className="space-y-4 py-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to account list
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Abhishek Choudhary"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#141518] border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-500"
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
                    className="w-full bg-[#141518] border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {loading ? 'Signing in...' : 'Sign in with Google'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Legal / Policy terms */}
            <div className="mt-8 pt-4 text-[11px] text-slate-400 leading-relaxed font-sans">
              Before using this app, you can review healthsync.com's{' '}
              <span className="text-teal-400 hover:underline cursor-pointer">Privacy Policy</span> and{' '}
              <span className="text-teal-400 hover:underline cursor-pointer">Terms of Service</span>.
            </div>
          </div>
        </div>

        {/* Bottom footer identical to Google's official footer */}
        <div className="px-8 py-3.5 bg-[#141518] border-t border-[#25272d] flex items-center justify-between text-[11px] text-slate-500 font-sans">
          <span>English (United Kingdom)</span>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Help</span>
            <span className="hover:text-slate-300 cursor-pointer">Privacy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
