// ==============================================================================
// DigiX Technologies - Modern Enterprise Employee & HR Portal Login Experience
// File: src/pages/auth/LoginPage.jsx
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Send,
  KeyRound,
  ArrowRight
} from 'lucide-react';

export const LoginPage = () => {
  const { login, authError, setAuthError } = useAuth();
  const { recordLoginAttendance } = usePortalData();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetStatus, setResetStatus] = useState(null); // 'success' | 'error' | null
  const [resetFeedback, setResetFeedback] = useState('');

  // Handle Login Submission (Unchanged authentication logic)
  const handleCustomLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      addToast({
        type: 'warning',
        title: 'Email Required',
        message: 'Please enter your corporate email address.'
      });
      return;
    }

    if (!password) {
      addToast({
        type: 'warning',
        title: 'Password Required',
        message: 'Please enter your account password.'
      });
      return;
    }

    setIsLoading(true);
    if (setAuthError) setAuthError(null);

    try {
      const res = await login(trimmedEmail, password);
      setIsLoading(false);

      if (!res.success) {
        addToast({
          type: 'error',
          title: 'Sign In Failed',
          message: res.error?.message || 'Authentication failed. Please verify credentials.'
        });
        return;
      }

      const loggedUser = res.user;
      if (recordLoginAttendance) {
        recordLoginAttendance(loggedUser);
      }

      addToast({
        type: 'success',
        title: `Welcome back, ${loggedUser.name}!`,
        message: `Signed in to ${loggedUser.role?.toUpperCase() || 'DIGIX'} workspace.`
      });

      // Role-Based Access Control redirection
      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'hr' || loggedUser.role === 'hr_manager') {
        navigate('/hr/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err) {
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Sign In Error',
        message: err.message || 'An unexpected error occurred during sign in.'
      });
    }
  };

  // Handle Forgot Password Submission via Supabase Auth
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (isResetSubmitting) return;

    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      setResetStatus('error');
      setResetFeedback('Please enter your corporate email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setResetStatus('error');
      setResetFeedback('Please enter a valid email address.');
      return;
    }

    setIsResetSubmitting(true);
    setResetStatus(null);
    setResetFeedback('');

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/#/setup-password`
        });
        if (error) throw error;
      }

      setResetStatus('success');
      setResetFeedback(`Password reset instructions have been sent to ${targetEmail}. Please check your corporate inbox.`);
      addToast({
        type: 'success',
        title: 'Reset Link Dispatched',
        message: `Recovery instructions sent to ${targetEmail}`
      });
    } catch (err) {
      console.warn('[LoginPage] Reset password error:', err);
      setResetStatus('error');
      setResetFeedback(err.message || 'Unable to send reset instructions. Please contact your IT administrator.');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-[#031B52] via-[#062D78] to-[#041E56] font-sans text-slate-900 selection:bg-sky-200 selection:text-blue-900 relative overflow-x-hidden">
      
      {/* ==================================================================== */}
      {/* 1. DEEP PREMIUM DIGIX BACKGROUND: NEON WAVES, GLOWS & PARTICLES     */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top Ambient Glow Behind Brand Logo */}
        <div 
          className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-sky-400/25 via-blue-500/15 to-transparent blur-[110px] rounded-full" 
        />
        
        {/* Soft Radial Center-Floor Atmospheric Glow */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-gradient-to-t from-[#0091FF]/22 via-[#064FC4]/18 to-transparent blur-[120px] rounded-full" 
        />

        {/* Ambient Side Accent Lights */}
        <div 
          className="absolute top-[28%] -left-32 w-80 h-80 bg-cyan-400/12 blur-[100px] rounded-full" 
        />
        <div 
          className="absolute top-[32%] -right-32 w-80 h-80 bg-blue-500/15 blur-[100px] rounded-full" 
        />

      {/* Flowing Neon Wave Lines (Matching Reference Curve Dynamics) */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          preserveAspectRatio="none" 
          viewBox="0 0 1440 900" 
          fill="none" 
        >
          {/* Main Sweeping Neon Wave Glow */}
          <path 
            d="M -50 240 C 200 360, 480 620, 920 500 C 1180 420, 1360 320, 1500 280" 
            stroke="url(#neonWaveGrad1)" 
            strokeWidth="4" 
            strokeLinecap="round" 
            filter="url(#neonGlowFilter)"
            opacity="0.9"
          />
          {/* Main Sweeping Neon Wave Core Bright Line */}
          <path 
            d="M -50 240 C 200 360, 480 620, 920 500 C 1180 420, 1360 320, 1500 280" 
            stroke="url(#neonWaveCoreGrad)" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            opacity="0.95"
          />

          {/* Lower Floor Level Horizon Wave */}
          <path 
            d="M -80 710 C 340 620, 800 770, 1540 670" 
            stroke="url(#neonWaveGrad2)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            filter="url(#neonGlowFilter)"
            opacity="0.75" 
          />
          {/* Lower Floor Level Horizon Wave Core */}
          <path 
            d="M -80 710 C 340 620, 800 770, 1540 670" 
            stroke="url(#neonWaveCoreGrad)" 
            strokeWidth="1.2" 
            strokeLinecap="round" 
            opacity="0.9" 
          />

          {/* Secondary Ambient Accent Wave */}
          <path 
            d="M -40 430 C 360 500, 720 730, 1500 510" 
            stroke="url(#neonWaveGrad1)" 
            strokeWidth="1.2" 
            strokeLinecap="round" 
            opacity="0.35" 
          />

          <defs>
            <filter id="neonGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="neonWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.1" />
              <stop offset="15%" stopColor="#00D2FF" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#0072FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="neonWaveCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#7DD3FC" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="neonWaveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066FF" stopOpacity="0.1" />
              <stop offset="35%" stopColor="#00D2FF" stopOpacity="0.85" />
              <stop offset="85%" stopColor="#0088FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>

        {/* Scattered Glowing Particle Sparks */}
        <div className="absolute top-[12%] left-[16%] w-1.5 h-1.5 rounded-full bg-cyan-200 shadow-[0_0_8px_#38BDF8] animate-float-slow" />
        <div className="absolute top-[18%] right-[20%] w-2 h-2 rounded-full bg-sky-300 shadow-[0_0_10px_#00D2FF] animate-float-delayed" />
        <div className="absolute top-[36%] left-[8%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#38BDF8] animate-float-slow" />
        <div className="absolute top-[48%] right-[11%] w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#38BDF8] animate-float-delayed" />
        <div className="absolute top-[68%] left-[19%] w-1 h-1 rounded-full bg-sky-200 shadow-[0_0_6px_#38BDF8] animate-float-slow" />
        <div className="absolute top-[78%] right-[22%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#60A5FA] animate-float-delayed" />
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP BRANDING & HERO BANNER (Balanced Spacing & Controlled Type)  */}
      {/* ==================================================================== */}
      <header className="relative z-10 w-full pt-3 sm:pt-4 md:pt-5 pb-1 sm:pb-2 px-4 select-none">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          
          {/* DigiX Animated Transparent Network Logo */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-default mb-1.5 flex items-center justify-center">
              {/* Soft Ambient Radial Behind Logo */}
              <div 
                className="absolute -inset-6 rounded-full bg-gradient-to-r from-orange-500/25 via-amber-400/20 to-sky-400/15 blur-2xl pointer-events-none" 
                aria-hidden="true" 
              />

              {/* Logo Entrance & Subtle Idle Float Container */}
              <div className="relative digix-logo-entrance digix-logo-idle w-[72px] h-[72px] sm:w-20 sm:h-20 md:w-[88px] md:h-[88px] flex items-center justify-center select-none">
                {/* Transparent Orange Network Symbol with Contour Glow */}
                <img
                  src="/images/digix-logo-transparent.png"
                  alt="DigiX Technologies Logo"
                  className="w-full h-full object-contain digix-logo-glow drop-shadow-lg"
                  loading="eager"
                />

                {/* Network Node Pulse Light Highlights (Animation C) */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  {/* Central Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '51.4%', left: '52.7%', animationDelay: '0s' }} />
                  {/* Top Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '12.1%', left: '55.0%', animationDelay: '0.6s' }} />
                  {/* Top-Right Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '41.7%', left: '82.1%', animationDelay: '1.2s' }} />
                  {/* Bottom-Right Large Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '87.2%', left: '68.9%', animationDelay: '1.8s' }} />
                  {/* Bottom-Left Yellow Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '66.0%', left: '14.8%', animationDelay: '2.4s' }} />
                  {/* Upper-Left Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '34.7%', left: '33.6%', animationDelay: '3.0s' }} />
                  {/* Lower-Center Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '72.7%', left: '44.6%', animationDelay: '3.6s' }} />
                  {/* Middle-Right Node Pulse */}
                  <span className="digix-node-pulse" style={{ top: '66.5%', left: '90.1%', animationDelay: '4.2s' }} />
                </div>
              </div>
            </div>

            {/* Brand Title and Subtitle with Polish Entrance Animation D */}
            <div className="digix-brand-text-entrance">
              <h2 className="text-xl sm:text-[23px] font-bold tracking-tight text-white leading-tight">
                Digi<span className="text-[#38BDF8]">X</span> Technologies
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-sky-200/85 tracking-wide mt-0.5">
                Enterprise Employee &amp; HR Portal
              </p>
            </div>
          </div>

          {/* Controlled Hero Headline with comfortable vertical spacing */}
          <div className="mt-5 sm:mt-6 md:mt-7 max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold tracking-tight text-white leading-tight">
              Work better.{' '}
              <span className="text-[#38BDF8]">
                We handle the rest.
              </span>
            </h1>

            {/* Supporting Text with appropriate breathing room */}
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-[14px] text-blue-100/85 max-w-xl mx-auto leading-relaxed font-normal">
              Manage your people, work, attendance, and employee services in one secure place.
            </p>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 3. MAIN COMPOSITION: TWO COLUMNS (CHARACTER ON LEFT, CARD ON RIGHT)  */}
      {/* ==================================================================== */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 sm:px-6 pt-2 sm:pt-4 md:pt-6 pb-6 w-full max-w-6xl mx-auto">
        
        {/* Two-Column Centered Layout: Character on Left, Login Card on Right */}
        <div className="flex flex-col md:flex-row items-center justify-center md:gap-2 lg:gap-3 xl:gap-4 w-full max-w-5xl mx-auto">

          {/* Left Column: 3D Boy Character (Standing independently, pointing towards card, non-overlapping) */}
          <div 
            className="hidden md:flex md:w-[44%] lg:w-[44%] xl:w-[42%] items-center justify-end relative select-none pointer-events-none"
            aria-hidden="true"
          >
            <div className="relative w-full max-w-[315px] lg:max-w-[355px] xl:max-w-[385px] flex items-center justify-center md:translate-x-4 lg:translate-x-6 xl:translate-x-7">
              {/* Soft Contact Floor Shadow under character's feet */}
              <div 
                className="absolute -bottom-2 left-[20%] w-[58%] h-5 bg-blue-950/70 blur-md rounded-full pointer-events-none" 
              />
              
              {/* Subtle Blue Underlight Glow Reflection on floor */}
              <div 
                className="absolute -bottom-4 left-[24%] w-[50%] h-8 bg-sky-400/20 blur-lg rounded-full pointer-events-none" 
              />

              <img 
                src="/digix_3d_boy.png?v=6" 
                alt="DigiX 3D Boy Character" 
                className="w-full h-auto object-contain drop-shadow-[0_20px_35px_rgba(2,12,38,0.55)] select-none"
              />
            </div>
          </div>

          {/* Right Column: Login Card Container */}
          <div className="w-full max-w-[420px] sm:max-w-[450px] md:max-w-[440px] lg:max-w-[480px] xl:max-w-[500px] md:w-[54%] lg:w-[52%] xl:w-[50%] md:-translate-x-3 lg:-translate-x-5 xl:-translate-x-6 mx-auto">
            <div className="w-full bg-white rounded-[24px] sm:rounded-[26px] lg:rounded-[28px] shadow-[0_25px_60px_-15px_rgba(2,12,38,0.5),0_0_35px_rgba(56,189,248,0.16)] border border-white/95 p-6 sm:p-8 lg:p-9 relative z-10">
            
            {/* Subtle Top Card Aura */}
            <div 
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-6 bg-gradient-to-r from-sky-400/20 via-blue-500/15 to-transparent blur-xl rounded-full pointer-events-none" 
              aria-hidden="true" 
            />

            {/* Card Header */}
            <div className="mb-4 sm:mb-5 text-left">
              <h2 className="text-2xl sm:text-[26px] lg:text-[27px] font-bold tracking-tight text-slate-900 leading-tight">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-1.5 leading-relaxed">
                Sign in to manage your work and continue to your DigiX workspace.
              </p>
            </div>

            {/* Authentication Error Banner */}
            {authError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-rose-900">Unable to sign in</p>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{authError}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleCustomLogin} className="space-y-3.5 sm:space-y-4" noValidate>
              
              {/* Work Email Field */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5"
                >
                  Work email
                </label>
                <div className="relative rounded-xl">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@digix.internal"
                    className="block w-full rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder-slate-400 py-2.5 sm:py-3 pl-10 sm:pl-11 pr-4 transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-sky-400/15 shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5"
                >
                  Password
                </label>
                <div className="relative rounded-xl">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder-slate-400 py-2.5 sm:py-3 pl-10 sm:pl-11 pr-11 transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-sky-400/15 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-blue-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Keep me signed in & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-sky-400/20 focus:ring-2 cursor-pointer"
                  />
                  <span className="font-medium text-slate-700">Keep me signed in</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email || '');
                    setResetStatus(null);
                    setResetFeedback('');
                    setIsForgotModalOpen(true);
                  }}
                  className="font-semibold text-[#0D5CE5] hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Vibrant Blue Sign In Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 sm:py-3.5 px-6 rounded-xl text-sm sm:text-base font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
                    isLoading
                      ? 'bg-blue-400 cursor-not-allowed opacity-90'
                      : 'bg-gradient-to-r from-[#0C58D1] via-[#084FB9] to-[#07449E] hover:from-[#1162DF] hover:to-[#094CAE] active:from-[#09408E] active:to-[#063374] shadow-blue-700/35 hover:shadow-xl hover:shadow-sky-400/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.4]" />
                    </>
                  )}
                </button>
              </div>

              {/* Request Account Access Link */}
              <div className="pt-2 text-center text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
                <span>Need access?</span>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="font-semibold text-[#0D5CE5] hover:text-blue-700 hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded flex items-center gap-1"
                >
                  <span>Request Account Access</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>

      {/* ==================================================================== */}
      {/* 4. CLEAN FOOTER                                                      */}
      {/* ==================================================================== */}
      <footer className="relative z-10 py-3.5 text-center text-xs text-blue-200/60 select-none">
        &copy; 2026 DigiX Technologies. All rights reserved.
      </footer>

      {/* ==================================================================== */}
      {/* 5. FORGOT PASSWORD ACCESSIBLE MODAL DIALOG                           */}
      {/* ==================================================================== */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-blue-100 shadow-2xl p-6 sm:p-7 relative animate-in zoom-in-95 duration-150">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              aria-label="Close dialog"
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 id="forgot-password-title" className="text-lg font-bold text-slate-900">
                  Reset password
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your work email to receive recovery instructions.
                </p>
              </div>
            </div>

            {/* Feedback Alerts */}
            {resetStatus === 'error' && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{resetFeedback}</span>
              </div>
            )}

            {resetStatus === 'success' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900 mb-0.5">Recovery email sent</p>
                    <p className="leading-relaxed text-emerald-700">{resetFeedback}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Work email
                  </label>
                  <div className="relative rounded-xl">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@digix.internal"
                      className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-3 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-sky-400/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isResetSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Instructions</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Need help? Contact IT Support at{' '}
                <a href="mailto:support@digix.internal" className="text-blue-600 hover:underline">
                  support@digix.internal
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

