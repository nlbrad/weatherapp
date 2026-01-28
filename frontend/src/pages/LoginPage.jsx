/**
 * LoginPage.jsx - Authentication Landing Page
 * 
 * Beautiful login page with Azure B2C integration.
 * Supports Microsoft and Google social login.
 * 
 * Features:
 * - Animated background
 * - Social login buttons
 * - Development mode bypass (when B2C not configured)
 * - Error handling
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Loader, AlertCircle, Zap, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '../auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginPopup, isAuthConfigured, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Where to redirect after login
  const from = location.state?.from?.pathname || '/';

  /**
   * Handle login click
   */
  const handleLogin = async (method = 'redirect') => {
    setLoading(true);
    setError(null);

    try {
      if (method === 'popup') {
        await loginPopup();
        navigate(from, { replace: true });
      } else {
        await login();
        // Redirect happens automatically
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Development mode login (when B2C not configured)
   */
  const handleDevLogin = () => {
    // In dev mode, just redirect to home
    navigate(from, { replace: true });
  };

  // Feature list for the login page
  const features = [
    { icon: Zap, text: 'Smart weather & sky alerts' },
    { icon: Shield, text: 'Severe weather warnings' },
    { icon: Smartphone, text: 'Telegram notifications' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl animate-pulse"
             style={{ animationDelay: '2s' }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">OmniAlert</h1>
            <p className="text-slate-400 text-sm">Intelligent alerts for weather, sky & more</p>
          </div>

          {/* Features */}
          <div className="mb-8 space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-8 h-8 bg-slate-800/50 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Login Failed</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Login Buttons */}
          <div className="space-y-4">
            {isAuthConfigured ? (
              <>
                {/* Microsoft Login */}
                <button
                  onClick={() => handleLogin('redirect')}
                  disabled={loading || authLoading}
                  className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 text-white py-3 px-4 rounded-xl transition-all duration-200"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                  )}
                  Sign in with Microsoft
                </button>

                {/* Google Login (if configured in B2C) */}
                <button
                  onClick={() => handleLogin('redirect')}
                  disabled={loading || authLoading}
                  className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 text-white py-3 px-4 rounded-xl transition-all duration-200"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Sign in with Google
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900 text-slate-500">or</span>
                  </div>
                </div>

                {/* Email Login (B2C handles this) */}
                <button
                  onClick={() => handleLogin('redirect')}
                  disabled={loading || authLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Sign in with Email'
                  )}
                </button>
              </>
            ) : (
              /* Development Mode - B2C Not Configured */
              <>
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                  <p className="text-amber-400 text-sm font-medium">Development Mode</p>
                  <p className="text-amber-400/70 text-xs mt-1">
                    Azure B2C is not configured. Click below to continue in development mode.
                  </p>
                </div>
                
                <button
                  onClick={handleDevLogin}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  Continue as Demo User
                </button>

                <p className="text-slate-500 text-xs text-center mt-4">
                  To enable real authentication, configure Azure B2C in
                  <code className="text-cyan-400 mx-1">.env</code>
                </p>
              </>
            )}
          </div>

          {/* Sign Up Link */}
          {isAuthConfigured && (
            <p className="text-center text-slate-500 text-sm mt-6">
              Don't have an account?{' '}
              <button 
                onClick={() => handleLogin('redirect')}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Sign up
              </button>
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          {isAuthConfigured ? 'Secured by Microsoft Entra' : 'Development Mode - No Authentication'}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;