/**
 * Cloudflare Worker entry point.
 *
 * The whole application is static: this script serves the built assets, adds the
 * headers a `<meta>` tag cannot, and returns a real 404 for anything that is not
 * a file. There is no API, no state and nothing kept.
 *
 * Workers, not Pages. They are different products and the difference has already
 * cost Psychrometric Studio a deploy — a Pages-style `functions/` directory is
 * ignored here, and the wrong `not_found_handling` answers 200 with the
 * application shell for any unknown path.
 *
 * The content security policy lives in `index.html` as a meta tag rather than
 * here, so it applies in `npm run dev` too. A policy that only exists in
 * production is a policy discovered in production. Only the directives a meta
 * tag cannot express are set below.
 */
interface Env {
  /** Static assets, bound by `assets.binding` in wrangler.jsonc. */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const SECURITY_HEADERS: Record<string, string> = {
  // meta CSP ignores frame-ancestors and only logs an error, so it is set here.
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const NOT_FOUND = `<!doctype html><meta charset="utf-8">
<title>Not found — ZEEL</title>
<style>body{font:16px system-ui;margin:12vh auto;max-width:38ch;padding:0 1rem;color:#14202b}
a{color:#0F5F52}</style>
<h1>Not found</h1>
<p>There is nothing at this address. <a href="/">Open ZEEL</a>.</p>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);

    if (response.status === 404) {
      return new Response(NOT_FOUND, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
      });
    }

    // The asset response is immutable, so headers go onto a copy.
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
