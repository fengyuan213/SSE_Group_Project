import { Auth0Provider as Auth0ProviderSDK } from '@auth0/auth0-react';
import { type ReactNode } from 'react';

interface Auth0ProviderProps {
  children: ReactNode;
}

export const Auth0Provider = ({ children }: Auth0ProviderProps) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  // Use Codespaces URL from env, fallback to window.location.origin
  const redirectUri = import.meta.env.VITE_APP_URL || window.location.origin;

  if (!domain || !clientId) {
    throw new Error('Auth0 configuration is missing. Check your .env file.');
  }

  return (
    <Auth0ProviderSDK
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: 'openid profile email'
      }}
      cacheLocation="memory"
    >
      {children}
    </Auth0ProviderSDK>
  );
};
