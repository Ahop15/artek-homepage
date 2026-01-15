/**
 * ARTEK AI Worker Dashboard
 *
 * Cloudflare Worker that serves as a reverse-proxy to Streamlit container
 * with Cloudflare Access authentication for production environments.
 */

import { Container, getContainer } from '@cloudflare/containers';
import { Hono } from 'hono';
import { validateAccessJWT } from './auth/access';

// Streamlit Container Configuration
export class StreamlitContainer extends Container<Env> {
  // Streamlit default port
  defaultPort = 8501;

  // Dashboard idle timeout (5 minutes)
  sleepAfter = '5m';

  // Lifecycle hooks
  override onStart() {
    console.log('Streamlit container started');
  }

  override onStop() {
    console.log('Streamlit container stopped');
  }

  override onError(error: unknown) {
    console.error('Streamlit container error:', error);
  }
}

/**
 * Build Cloudflare Access logout URL
 */
function buildLogoutUrl(teamDomain: string): string {
  const domain = teamDomain.startsWith('https://')
    ? teamDomain
    : `https://${teamDomain}.cloudflareaccess.com`;

  return `${domain}/cdn-cgi/access/logout`;
}

// Hono app with Cloudflare Workers typing
const app = new Hono<{
  Bindings: Env;
  Variables: {
    user?: { email: string; sub: string };
  };
}>();

// Logout endpoint (before auth middleware)
app.get('/logout', (c) => {
  // Development mode - just redirect to home
  if (c.env.ENVIRONMENT === 'dev') {
    return c.redirect('/');
  }

  // Production - redirect to Access logout
  if (c.env.TEAM_DOMAIN) {
    const logoutUrl = buildLogoutUrl(c.env.TEAM_DOMAIN);
    return c.redirect(logoutUrl, 302);
  }

  return c.redirect('/');
});

// Authentication middleware (production only)
app.use('*', async (c, next) => {
  const result = await validateAccessJWT(c.req.raw, c.env);

  if (!result.authenticated) {
    // Redirect to Cloudflare Access login if available
    if (result.redirectUrl) {
      return c.redirect(result.redirectUrl, 302);
    }
    // Fallback to JSON error (e.g., config error)
    return c.json({ error: 'Unauthorized', message: result.error }, 403);
  }

  // Attach user to context
  if (result.user) {
    c.set('user', result.user);
  }

  await next();
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reverse proxy all requests to Streamlit container (singleton pattern)
app.all('*', async (c) => {
  const container = getContainer(c.env.STREAMLIT);

  // Forward the request to container
  return await container.fetch(c.req.raw);
});

export default app;
