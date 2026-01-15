/**
 * Extended environment bindings for Cloudflare Access secrets
 *
 * These are configured via:
 *   wrangler secret put TEAM_DOMAIN
 *   wrangler secret put POLICY_AUD
 */

declare global {
	interface Env {
		// Cloudflare Access configuration (secrets)
		TEAM_DOMAIN?: string;  // e.g., https://your-team.cloudflareaccess.com
		POLICY_AUD?: string;   // Application AUD tag from Access dashboard
	}
}

export {};