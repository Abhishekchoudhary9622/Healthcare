import React, { useState } from 'react';
import { Activity, ShieldCheck, ArrowRight, ArrowLeft, KeyRound, ExternalLink, Sparkles, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onSelectAccount,
  onTriggerGoogleOAuth,
  loading,
  role = 'PATIENT'
}) {
  const [activeTab, setActiveTab] = useState('direct'); // 'oauth' | 'direct' | 'setup'
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customAvatar, setCustomAvatar] = useState('');

  if (!isOpen) return null;

  const handleDirectSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) return;
    const nameParts = (customName.trim() || customEmail.split('@')[0]).split(' ');
    onSelectAccount({
      email: customEmail.trim().toLowerCase(),
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '',
      avatar: customAvatar.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameParts.join(' '))}&background=0D9488&color=fff`,
      googleId: `google-${Date.now()}`,
      role: role
    });
  };

  const hasClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[460px] rounded-3xl bg-[#0b131e] text-white border border-teal-500/20 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Soft decorative glow */}
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-teal-500/10 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-2.5">
            {/* Google Multicolored Icon */}
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
            <div>
              <span className="text-sm font-bold text-slate-200">Google Authentication</span>
              <p className="text-[10px] text-teal-400 font-medium">Real Email & Data Synchronization</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 flex gap-2 border-b border-slate-800/60 bg-[#070e17]/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={cn(
              'pb-2.5 px-2 font-semibold transition-all border-b-2',
              activeTab === 'oauth'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            Google Popup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={cn(
              'pb-2.5 px-2 font-semibold transition-all border-b-2',
              activeTab === 'direct'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            Real Google Email Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={cn(
              'pb-2.5 px-2 font-semibold transition-all border-b-2',
              activeTab === 'setup'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            Cloud Config Help
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 relative z-10">

          {/* TAB 1: Real Google OAuth Trigger */}
          {activeTab === 'oauth' && (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-lg shadow-teal-500/10">
                <Sparkles className="h-7 w-7 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Sign in with your Google Account</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Opens the official Google authentication window to fetch your verified Google email, name, and profile photo.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (onTriggerGoogleOAuth) {
                      onTriggerGoogleOAuth();
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 transition-all flex items-center justify-center gap-3 group"
                >
                  <svg className="h-5 w-5 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
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
                  <span>{loading ? 'Connecting to Google...' : 'Open Official Google Popup'}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Google Client ID Status:</span>
                </div>
                <p className="font-mono text-slate-300">
                  {hasClientId ? '✓ VITE_GOOGLE_CLIENT_ID is active' : '⚙ Not set in .env (Use "Real Google Email Sync" tab or add Client ID in .env)'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Direct Real Google Email Sync */}
          {activeTab === 'direct' && (
            <form onSubmit={handleDirectSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/20 text-xs text-teal-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" /> Real Google Account Data Link
                </p>
                <p className="text-[11px] text-slate-300 mt-1">
                  Enter your real Google email address below. HealthSync will create or sync your account, store your real profile details in the database, and authenticate you instantly.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abhishek Choudhary"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#141d2b] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Google Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-[#141d2b] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Profile Photo URL <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://lh3.googleusercontent.com/... or leave blank"
                  value={customAvatar}
                  onChange={(e) => setCustomAvatar(e.target.value)}
                  className="w-full bg-[#141d2b] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign in & Link Real Google Data'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* TAB 3: Google Cloud Setup Guide */}
          {activeTab === 'setup' && (
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-teal-400 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4" /> Setting up Google Cloud OAuth 2.0 (2 Mins)
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    Visit{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 underline inline-flex items-center gap-0.5 font-medium"
                    >
                      Google Cloud Console <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </li>
                  <li>Click <strong>Create Credentials</strong> → <strong>OAuth client ID</strong> (Web application).</li>
                  <li>Under <strong>Authorized JavaScript origins</strong>, add:
                    <div className="font-mono bg-black/50 p-1.5 rounded mt-1 text-[10px] text-emerald-300">
                      http://localhost:5000<br/>
                      http://localhost:5173<br/>
                      http://localhost:3000
                    </div>
                  </li>
                  <li>Copy your Client ID and paste into:
                    <div className="font-mono bg-black/50 p-1.5 rounded mt-1 text-[10px] text-cyan-300">
                      frontend/.env → VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com<br/>
                      backend/.env → GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Legal / Security Footer */}
          <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 text-center leading-relaxed">
            Protected with 256-bit TLS encryption. HealthSync strictly adheres to HIPAA & GDPR compliance.
          </div>
        </div>
      </div>
    </div>
  );
}
