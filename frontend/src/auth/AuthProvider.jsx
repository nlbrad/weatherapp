/**
 * AuthProvider.jsx - Authentication Context Provider
 * 
 * Wraps the app with MSAL authentication and provides:
 * - User login/logout functions
 * - Current user state
 * - Loading states
 * - Token acquisition
 * 
 * Usage:
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PublicClientApplication, EventType, InteractionStatus } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, loginRequest, isAuthConfigured } from './authConfig';

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
  // Handle redirect promise on page load
  msalInstance.handleRedirectPromise().then((response) => {
    if (response) {
      msalInstance.setActiveAccount(response.account);
    }
  }).catch((error) => {
    console.error('Redirect error:', error);
  });

  // Set active account if one exists
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Listen for login events
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
      msalInstance.setActiveAccount(event.payload.account);
    }
  });
});

// Auth Context
const AuthContext = createContext(null);

/**
 * Hook to access auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Inner provider that uses MSAL hooks
 */
const AuthProviderInner = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get current user from account
  useEffect(() => {
    if (accounts.length > 0) {
      const account = accounts[0];
      setUser({
        id: account.localAccountId || account.homeAccountId,
        email: account.username,
        name: account.name || account.username?.split('@')[0],
        // B2C claims can include custom attributes
        ...account.idTokenClaims,
      });
    } else {
      setUser(null);
    }
    
    // Only set loading false after MSAL is done initializing
    if (inProgress === InteractionStatus.None) {
      setLoading(false);
    }
  }, [accounts, inProgress]);

  /**
   * Login with redirect
   */
  const login = useCallback(async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * Login with popup (alternative)
   */
  const loginPopup = useCallback(async () => {
    try {
      const response = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(response.account);
      return response;
    } catch (error) {
      console.error('Login popup error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * Get access token for API calls
   */
  const getAccessToken = useCallback(async () => {
    const account = instance.getActiveAccount();
    if (!account) {
      throw new Error('No active account');
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      // If silent fails, try popup
      console.warn('Silent token acquisition failed, trying popup:', error);
      const response = await instance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
  }, [instance]);

  /**
   * Get user ID for API calls
   * This replaces the hardcoded "user123"
   */
  const getUserId = useCallback(() => {
    if (user?.id) {
      return user.id;
    }
    // Fallback for development without Entra configured
    if (!isAuthConfigured()) {
      return 'dev-user-123';
    }
    return null;
  }, [user]);

  const value = {
    user,
    isAuthenticated,
    loading,
    inProgress: inProgress !== InteractionStatus.None,
    login,
    loginPopup,
    logout,
    getAccessToken,
    getUserId,
    isAuthConfigured: isAuthConfigured(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Main AuthProvider component
 * Wraps children with MSAL provider
 */
export const AuthProvider = ({ children }) => {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </MsalProvider>
  );
};

export default AuthProvider;
