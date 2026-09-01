# Deploying

Everything runs in the browser. There is no server, no database and nothing kept
— which is also why there is nothing to back up and nothing to breach.

**Live at `https://zeel.patpease0.workers.dev`.** `peasestudio.com` is registered
but not yet serving, so the beta sits on a workers.dev subdomain. The host is
stamped on every exported chart, so when the domain moves, change
`BRAND.host` in `src/config/branding.ts` in the same commit as the route — an
export naming a host that does not resolve is worse than one naming none.

## Workers, not Pages

They are different products. Psychrometric Studio lost a deploy to the
difference: a Pages-style `functions/` directory is silently ignored under
Workers, and the wrong `not_found_handling` answers `200` with the application
shell for every unknown path.

```bash
npm run preview:worker   # builds, then serves in the real Workers runtime
npm run deploy           # builds, then wrangler deploy
```

`npm run preview` serves the built files over plain HTTP and is fine for looking
at the interface, but it does **not** run the Worker — so it proves nothing about
headers or 404s. Use `preview:worker` for those.

## Two settings that are easy to get wrong

**`not_found_handling: "none"`.** ZEEL has no client-side router, so nothing
legitimately resolves to a path that is not a file. The
`single-page-application` setting would turn every typo into a `200`.

**`run_worker_first: true`.** Without it, a request matching an asset is served
straight from the asset store and the script never runs. The security headers
would then be missing from every page that actually loads and present only on
the 404 — which looks fine in a spot check of a bad URL and is wrong everywhere
that matters.

## The content security policy

Split deliberately across two places:

- **`index.html`** carries the policy as a `<meta>` tag, so it applies in
  `npm run dev` too. A policy that exists only in production is a policy
  discovered in production.
- **`worker/index.ts`** carries `frame-ancestors`, which a meta CSP ignores while
  logging an error, plus the headers that are not CSP at all.

There is no `'unsafe-inline'` on either `script-src` or `style-src`. Keeping
`style-src` clean is an ongoing constraint on the code: **a value that varies per
element cannot be a `style` prop.** Colours that change — legend swatches,
palette chips — are SVG `fill` attributes, which are not styles. The chart
export builds a `<style>` block for the SVG it emits rather than writing `style`
attributes, for the same reason.

`npm run dev` reports style violations that production does not. Those are Vite's
injected `<style>` tags; the build emits a linked stylesheet. Verify the policy
against `npm run preview:worker`, never against the dev server.

## Verifying a deploy

```bash
npm test && npm run preview:worker
```

Then, against the running Worker:

- the root returns `200` with `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security` and a `frame-ancestors` CSP
- an unknown path returns a real `404`, not the application shell
- the console is clean, and a chart still exports to PNG — the export is the
  thing the CSP is most likely to break, and it is not covered by tests
