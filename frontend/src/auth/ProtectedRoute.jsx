/**
 * ProtectedRoute.jsx - Route Guard Component
 * 
 * Protects routes that require authentication.
 * Redirects to login page if user is not authenticated.
 * Shows loading spinner while checking auth state.
 * 
 * Usage:
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <DashboardPage />
 *   </ProtectedRoute>
 * } />
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader } from 'lucide-react';

/**
 * Loading Spinner Component
 */
const LoadingSpinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
      <p className="text-slate-400">Checking authentication...</p>
    </div>
  </div>
);

/**
 * ProtectedRoute Component
 * 
 * @param {React.ReactNode} children - The protected content
 * @param {string} redirectTo - Where to redirect if not authenticated (default: /login)
 */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading, isAuthConfigured } = useAuth();
  const location = useLocation();

  // Show loading while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Development mode: Skip auth if Entra not configured
  if (!isAuthConfigured) {
    console.warn('[Auth] Entra External ID not configured - allowing access in development mode');
    return children;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

/**
 * PublicOnlyRoute Component
 * 
 * For routes that should only be accessible when NOT logged in
 * (e.g., login page - redirect to home if already logged in)
 * 
 * @param {React.ReactNode} children - The public content
 * @param {string} redirectTo - Where to redirect if authenticated (default: /)
 */
export const PublicOnlyRoute = ({ children, redirectTo = '/' }) => {
  const { isAuthenticated, loading, isAuthConfigured } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Development mode: Show login page anyway for testing
  if (!isAuthConfigured) {
    return children;
  }

  // Redirect to home if already authenticated
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is not authenticated, show the public content
  return children;
};

export default ProtectedRoute;
