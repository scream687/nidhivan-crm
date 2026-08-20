'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Building2, ArrowLeft, Loader2 } from 'lucide-react';

type Screen = 'login' | 'forgot' | 'otp' | 'newpass';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);

  // Forgot password state
  const [fpEmail, setFpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  const { login } = useAuthStore();
  const router = useRouter();

  // Render's free plan sleeps the API after 15 min idle; the first request then
  // blocks ~90s while the container boots. The axios client has no timeout so it
  // does succeed — it just looks frozen. Say so, rather than adding a timeout
  // that would turn a slow login into a failed one.
  function withWakeNotice<T>(p: Promise<T>): Promise<T> {
    const t = setTimeout(() => setWaking(true), 4000);
    return p.finally(() => { clearTimeout(t); setWaking(false); });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await withWakeNotice(login(email, password));
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    setLoading(true);
    try {
      const { data } = await withWakeNotice(api.post('/auth/google', { idToken: credentialResponse.credential }));
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      useAuthStore.setState({ user: data.user });
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await withWakeNotice(api.post('/auth/forgot-password', { email: fpEmail }));
      toast.success('OTP sent! Check your email.');
      setScreen('otp');
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await withWakeNotice(api.post('/auth/verify-otp', { email: fpEmail, otp }));
      setResetToken(data.resetToken);
      setScreen('newpass');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    if (newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await withWakeNotice(api.post('/auth/reset-password', { resetToken, newPassword: newPass }));
      toast.success('Password updated! Please sign in.');
      setScreen('login');
      setFpEmail(''); setOtp(''); setResetToken(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111113] via-[#1d1d1f] to-[#111113] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#C02F12] rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">NIDHIVAN CRM</h1>
          <p className="text-[#626B76] text-sm mt-1">Property Linkers® — Sales Platform</p>
        </div>

        <motion.div
          key={screen}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          {/* ── LOGIN ── */}
          {screen === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@nidhivanproperty.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E04020]/60 transition" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button type="button" onClick={() => { setFpEmail(email); setScreen('forgot'); }}
                      className="text-xs text-[#E04020] hover:text-[#C02F12] hover:underline min-h-[44px] inline-flex items-center">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E04020]/60 transition" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#C02F12] hover:bg-[#A82717] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {waking ? 'Waking the server…' : 'Signing in…'}</span> : 'Sign in'}
                </button>
              </form>

              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => toast.error('Google login failed')}
                        text="continue_with"
                        shape="rectangular"
                        theme="outline"
                        size="large"
                        width="320"
                      />
                    </div>
                  </GoogleOAuthProvider>
                </>
              )}

              <p className="text-center text-xs text-gray-400 mt-6">© 2024 NIDHIVAN PROPERTY LINKERS®</p>
            </>
          )}

          {/* ── FORGOT PASSWORD — enter email ── */}
          {screen === 'forgot' && (
            <>
              <button onClick={() => setScreen('login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft size={14} /> Back to sign in
              </button>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Reset password</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a 6-digit OTP.</p>
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} required
                    placeholder="you@nidhivanproperty.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E04020]/60 transition" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#C02F12] hover:bg-[#A82717] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {waking ? 'Waking the server…' : 'Sending OTP…'}</span> : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* ── OTP VERIFICATION ── */}
          {screen === 'otp' && (
            <>
              <button onClick={() => setScreen('forgot')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft size={14} /> Change email
              </button>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Enter OTP</h2>
              <p className="text-gray-500 text-sm mb-1">We sent a 6-digit code to</p>
              <p className="text-[#E04020] font-medium text-sm mb-6">{fpEmail}</p>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">6-digit OTP</label>
                  <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required maxLength={6} placeholder="123456" inputMode="numeric"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-center tracking-[0.4em] text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#E04020]/60 transition" />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full bg-[#C02F12] hover:bg-[#A82717] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {waking ? 'Waking the server…' : 'Verifying…'}</span> : 'Verify OTP'}
                </button>
                <button type="button" onClick={handleForgotSubmit} disabled={loading}
                  className="w-full text-sm text-gray-500 hover:text-[#E04020] transition">
                  Resend OTP
                </button>
              </form>
            </>
          )}

          {/* ── NEW PASSWORD ── */}
          {screen === 'newpass' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Set new password</h2>
              <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                  <div className="relative">
                    <input type={showNewPw ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} required
                      minLength={8} placeholder="Min 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E04020]/60 transition" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E04020]/60 transition" />
                  {confirmPass && newPass !== confirmPass && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>
                <button type="submit" disabled={loading || newPass !== confirmPass}
                  className="w-full bg-[#C02F12] hover:bg-[#A82717] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {waking ? 'Waking the server…' : 'Updating…'}</span> : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </motion.div>

        {waking && (
          // text-gray-400 rather than the #626B76 used for the subtitle above:
          // that token is 3.48:1 on this background, and this is a message the
          // user actually has to read while waiting.
          <p role="status" className="mt-4 text-xs text-gray-400 text-center px-4">
            The server was asleep and is starting up. This can take up to a minute.
          </p>
        )}
      </div>
    </div>
  );
}
