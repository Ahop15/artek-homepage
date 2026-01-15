/**
 * Cloudflare Access JWT Validation
 *
 * Validates JWT tokens from Cloudflare Access for production authentication.
 * In development mode (ENVIRONMENT=dev), authentication is bypassed.
 */

import * as jose from 'jose';

export interface AccessPayload {
  email: string;
  sub: string;
  aud: string[];
  iss: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  authenticated: boolean;
  user?: {
    email: string;
    sub: string;
  };
  error?: string;
  redirectUrl?: string;
}

/**
 * Builds the Cloudflare Access login URL
 */
function buildAccessLoginUrl(teamDomain: string, requestUrl: string): string {
  // Ensure team domain has proper format
  const domain = teamDomain.startsWith('https://')
    ? teamDomain
    : `https://${teamDomain}.cloudflareaccess.com`;

  return `${domain}?redirect_url=${encodeURIComponent(requestUrl)}`;
}

/**
 * Validates Cloudflare Access JWT token
 *
 * @param request - Incoming request
 * @param env - Worker environment bindings
 * @returns Authentication result with user info or redirect URL
 */
export async function validateAccessJWT(
  request: Request,
  env: Env
): Promise<AuthResult> {
  // Development bypass
  if (env.ENVIRONMENT === 'dev') {
    return {
      authenticated: true,
      user: {
        email: 'dev@localhost',
        sub: 'dev-user',
      },
    };
  }

  // Validate required environment variables
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) {
    console.error('Missing TEAM_DOMAIN or POLICY_AUD configuration');
    return {
      authenticated: false,
      error: 'Server configuration error',
    };
  }

  // Build team domain URL
  const teamDomainUrl = env.TEAM_DOMAIN.startsWith('https://')
    ? env.TEAM_DOMAIN
    : `https://${env.TEAM_DOMAIN}.cloudflareaccess.com`;

  // Check for Access JWT token
  const token = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!token) {
    return {
      authenticated: false,
      error: 'No Access token provided',
      redirectUrl: buildAccessLoginUrl(env.TEAM_DOMAIN, request.url),
    };
  }

  try {
    // Create JWKS from Cloudflare Access certs endpoint
    const JWKS = jose.createRemoteJWKSet(
      new URL(`${teamDomainUrl}/cdn-cgi/access/certs`)
    );

    // Verify the token
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: teamDomainUrl,
      audience: env.POLICY_AUD,
    });

    const accessPayload = payload as unknown as AccessPayload;

    return {
      authenticated: true,
      user: {
        email: accessPayload.email,
        sub: accessPayload.sub,
      },
    };
  } catch (error) {
    console.error('JWT validation failed:', error);
    return {
      authenticated: false,
      error: 'Invalid or expired token',
      redirectUrl: buildAccessLoginUrl(env.TEAM_DOMAIN, request.url),
    };
  }
}