import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68e1ed5d239614c9c1853788", 
  requiresAuth: true // Ensure authentication is required for all operations
});
