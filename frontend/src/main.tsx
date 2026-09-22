import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const rootElement = document.getElementById("root")!;

if (!domain || !clientId || !audience) {
  createRoot(rootElement).render(
    <div style={{ padding: "2rem", fontFamily: "sans-serif", color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", margin: "2rem auto", maxWidth: "600px" }}>
      <h2 style={{ margin: "0 0 1rem 0" }}>Auth0 Configuration Missing</h2>
      <p>Required Auth0 environment variables are not configured:</p>
      <ul>
        {!domain && <li><code>VITE_AUTH0_DOMAIN</code></li>}
        {!clientId && <li><code>VITE_AUTH0_CLIENT_ID</code></li>}
        {!audience && <li><code>VITE_AUTH0_AUDIENCE</code></li>}
      </ul>
      <p>Please configure these variables in <code>frontend/.env</code> (refer to <code>frontend/.env.example</code>).</p>
    </div>
  );
} else {
  createRoot(rootElement).render(
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
        scope: "openid profile email",
      }}
      cacheLocation="memory"
    >
      <App />
    </Auth0Provider>
  );
}
