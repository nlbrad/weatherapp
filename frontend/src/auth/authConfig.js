/**
 * authConfig.js - Microsoft Entra External ID Configuration
 * 
 * Microsoft Entra External ID (formerly Azure AD B2C) is Microsoft's
 * customer identity and access management (CIAM) solution.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create an External ID tenant at entra.microsoft.com
 * 2. Register a new application
 * 3. Configure user flows (sign-up, sign-in)
 * 4. Replace the placeholder values below
 * 
 * Environment Variables (add to .env):
 * REACT_APP_ENTRA_CLIENT_ID=your-client-id
 * REACT_APP_ENTRA_TENANT_SUBDOMAIN=your-tenant-subdomain
 * REACT_APP_ENTRA_TENANT_ID=your-tenant-id (optional, for tenant-specific)
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Entra External ID Configuration
 * 
 * Two authority formats are supported:
 * 1. CIAMLOGIN (recommended for External ID): https://{subdomain}.ciamlogin.com
 * 2. B2CLOGIN (legacy B2C): https://{tenant}.b2clogin.com
 */
const entraConfig = {
  // Your tenant subdomain (e.g., "weatheralerts" from weatheralerts.ciamlogin.com)
  tenantSubdomain: process.env.REACT_APP_ENTRA_TENANT_SUBDOMAIN || 'weatheralerts',
  
  // Application (client) ID from Entra app registration
  clientId: process.env.REACT_APP_ENTRA_CLIENT_ID || 'your-client-id-here',
  
  // Tenant ID (optional - use for tenant-specific endpoints)
  tenantId: process.env.REACT_APP_ENTRA_TENANT_ID || '',
  
  // Redirect URI (must match what's configured in Entra)
  redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  
  // Use CIAM login endpoint (true) or legacy B2C endpoint (false)
  useCiamEndpoint: true,
};

// =============================================================================
// AUTHORITY URLS
// =============================================================================

/**
 * Build the authority URL for Entra External ID
 * 
 * CIAM format: https://{subdomain}.ciamlogin.com/{tenantId}
 * B2C format:  https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}
 */
const getAuthority = () => {
  if (entraConfig.useCiamEndpoint) {
    // Microsoft Entra External ID (CIAM) endpoint
    const tenantId = entraConfig.tenantId || `${entraConfig.tenantSubdomain}.onmicrosoft.com`;
    return `https://${entraConfig.tenantSubdomain}.ciamlogin.com/${tenantId}`;
  } else {
    // Legacy B2C endpoint (if migrating from B2C)
    const policy = process.env.REACT_APP_B2C_SIGNIN_POLICY || 'B2C_1_signupsignin';
    return `https://${entraConfig.tenantSubdomain}.b2clogin.com/${entraConfig.tenantSubdomain}.onmicrosoft.com/${policy}`;
  }
};

/**
 * Known authorities for MSAL
 */
const getKnownAuthorities = () => {
  if (entraConfig.useCiamEndpoint) {
    return [`${entraConfig.tenantSubdomain}.ciamlogin.com`];
  } else {
    return [`${entraConfig.tenantSubdomain}.b2clogin.com`];
  }
};

// =============================================================================
// MSAL CONFIGURATION
// =============================================================================

/**
 * MSAL Configuration Object
 * Used to initialize the MSAL instance
 * 
 * @see https://learn.microsoft.com/en-us/entra/external-id/customers/tutorial-single-page-app-react-sign-in-configure-authentication
 */
export const msalConfig = {
  auth: {
    clientId: entraConfig.clientId,
    authority: getAuthority(),
    knownAuthorities: getKnownAuthorities(),
    redirectUri: entraConfig.redirectUri,
    postLogoutRedirectUri: entraConfig.redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage', // 'sessionStorage' or 'localStorage'
    storeAuthStateInCookie: false,   // Set to true for IE11/Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case 0: // Error
            console.error('[MSAL]', message);
            break;
          case 1: // Warning  
            console.warn('[MSAL]', message);
            break;
          case 2: // Info
            // console.info('[MSAL]', message);
            break;
          case 3: // Verbose
            // console.debug('[MSAL]', message);
            break;
          default:
            break;
        }
      },
      logLevel: 1, // Warning level
    },
  },
};

// =============================================================================
// AUTHENTICATION REQUESTS
// =============================================================================

/**
 * Scopes for login request
 * 
 * For Entra External ID CIAM:
 * - 'openid' - Required for authentication
 * - 'profile' - User profile information
 * - 'offline_access' - Refresh tokens
 * - 'email' - User email address
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'offline_access'],
};

/**
 * Scopes for API access
 * 
 * When you protect your Azure Functions with Entra, add your API scope here.
 * Format: api://{client-id}/{scope-name} or https://{tenant}/{api-name}/{scope}
 */
export const apiRequest = {
  scopes: [
    // Example: `api://${entraConfig.clientId}/Weather.Read`
    // Example: `https://${entraConfig.tenantSubdomain}.onmicrosoft.com/weather-api/access`
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if Entra External ID is properly configured
 * Returns false if using placeholder values
 */
export const isAuthConfigured = () => {
  return entraConfig.clientId !== 'your-client-id-here' && 
         entraConfig.tenantSubdomain !== 'weatheralerts';
};

// Legacy alias for backwards compatibility
export const isB2CConfigured = isAuthConfigured;

/**
 * Get the current tenant info for debugging
 */
export const getTenantInfo = () => ({
  subdomain: entraConfig.tenantSubdomain,
  clientId: entraConfig.clientId,
  authority: getAuthority(),
  useCiam: entraConfig.useCiamEndpoint,
  configured: isAuthConfigured(),
});

export default msalConfig;
