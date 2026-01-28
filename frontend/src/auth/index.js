/**
 * Auth Module Exports
 * 
 * Provides authentication functionality for the Weather Alert System
 * using Microsoft Entra External ID via MSAL.js
 */

export { AuthProvider, useAuth } from './AuthProvider';
export { default as ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
export { 
  msalConfig, 
  loginRequest, 
  isAuthConfigured,
  isB2CConfigured, // Legacy alias
  getTenantInfo,
} from './authConfig';
