const path = require('path');
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const { withSentryConfig } = require('@sentry/nextjs');

// Public by construction: NEXT_PUBLIC_* is inlined into the browser bundle, so
// this is never a secret. Committed rather than left to a Cloudflare build
// variable because a missing build variable is invisible — it silently produces
// a bundle calling the Worker's own origin, which 404s on every request.
// Override it with a real NEXT_PUBLIC_API_URL to point a build elsewhere.
const DEFAULT_PROD_API_URL = 'https://nidhivan-crm-api.onrender.com/api/v1';

// Dev proxies to the API on localhost. In production the browser talks to the
// Render API cross-origin: socketStore.ts derives the socket origin from an
// absolute NEXT_PUBLIC_API_URL, a Worker has no 127.0.0.1 to forward to, and
// Next rewrites cannot proxy a WebSocket upgrade anyway.
const DEV_REWRITES = [
  { source: '/api/v1/:path*', destination: 'http://127.0.0.1:3001/api/v1/:path*' },
  { source: '/uploads/:path*', destination: 'http://127.0.0.1:3001/uploads/:path*' },
  { source: '/socket.io/:path*', destination: 'http://127.0.0.1:3001/socket.io/:path*' },
];

const sentryOptions = {
  // Only upload source maps when a DSN and auth token are present
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Disable source map upload in dev to keep builds fast
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
};

/**
 * Keyed off the build phase, not NODE_ENV. `next build` has not switched
 * NODE_ENV to production yet when this module is first evaluated, so a
 * module-scope NODE_ENV check silently never fires.
 *
 * @param {boolean} isProdBuild
 * @returns {import('next').NextConfig}
 */
function buildConfig(isProdBuild) {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || (isProdBuild ? DEFAULT_PROD_API_URL : '/api/v1');

  // A relative value is rejected as well as a missing one: '/api/v1' only
  // resolves behind the dev rewrite, and against a Worker it hits the Worker's
  // own origin and 404s. Catches a bad override, not just an absent one.
  if (isProdBuild && !/^https?:\/\//.test(apiUrl)) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be an absolute URL for a production build ' +
        `(e.g. ${DEFAULT_PROD_API_URL}), got ${JSON.stringify(apiUrl)}.`,
    );
  }

  return {
    // Without this Next walks up past the repo looking for a lockfile and picks
    // the developer's home directory as the workspace root, which drags the
    // wrong files into output file tracing (and resolves eslint from $HOME).
    outputFileTracingRoot: path.join(__dirname, '../..'),
    // Sentry's webpack plugin injects itself into the Pages-router _error shell.
    // The Next server build resolves @sentry/nextjs through its "node" export
    // condition, so build/cjs/edge/** is never traced — but OpenNext's esbuild
    // pass resolves "workerd", which points at exactly that file. Without this
    // the Cloudflare build dies on "Could not resolve @sentry/nextjs".
    outputFileTracingIncludes: {
      '/_error': ['../../node_modules/@sentry/nextjs/build/cjs/edge/**'],
    },
    transpilePackages: ['@nidhivan/shared'],
    env: { NEXT_PUBLIC_API_URL: apiUrl },
    // Nothing renders through next/image today, so this is inert. It stays as a
    // guard: Workers has no Next image optimizer, so the first next/image added
    // without this would need Cloudflare Images or a custom loader.
    images: { unoptimized: true },
    async rewrites() {
      return isProdBuild ? [] : DEV_REWRITES;
    },
  };
}

module.exports = (phase) =>
  withSentryConfig(buildConfig(phase === PHASE_PRODUCTION_BUILD), sentryOptions);
