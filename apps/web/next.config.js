const path = require('path');
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const { withSentryConfig } = require('@sentry/nextjs');

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Without this Next walks up past the repo looking for a lockfile and picks
  // the developer's home directory as the workspace root, which drags the wrong
  // files into output file tracing (and resolves eslint config from $HOME).
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Sentry's webpack plugin injects itself into the Pages-router _error shell.
  // The Next server build resolves @sentry/nextjs through its "node" export
  // condition, so build/cjs/edge/** never gets traced — but OpenNext's esbuild
  // pass resolves the "workerd" condition, which points at exactly that file.
  // Without this the Cloudflare build dies on "Could not resolve @sentry/nextjs".
  outputFileTracingIncludes: {
    '/_error': ['../../node_modules/@sentry/nextjs/build/cjs/edge/**'],
  },
  transpilePackages: ['@nidhivan/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  },
  // One next/image call site in the whole app — not worth standing up
  // Cloudflare Images or a custom loader to serve it.
  images: { unoptimized: true },
  async rewrites() {
    // Dev only. These proxy to the API running on localhost; in production the
    // browser talks to the Render API cross-origin (NEXT_PUBLIC_API_URL is
    // absolute, and socketStore.ts derives the socket origin from it). A Worker
    // has no 127.0.0.1 to forward to, and Next rewrites cannot proxy the
    // socket.io WebSocket upgrade in any case.
    //
    // NODE_ENV is reliable here: rewrites() runs late in the build, after Next
    // has switched it to production. It is NOT reliable at module scope.
    if (isProd) return [];

    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:3001/api/v1/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:3001/uploads/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://127.0.0.1:3001/socket.io/:path*',
      },
    ];
  },
};

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

// Keyed off the build phase rather than NODE_ENV: `next build` has not switched
// NODE_ENV to production yet when this module is first evaluated, so a NODE_ENV
// check at module scope silently never fires.
//
// NEXT_PUBLIC_* is inlined into the bundle at build time, so an unset value
// cannot be repaired by a runtime variable later — it ships a browser bundle
// pointing at the wrong origin. A Worker has no local API to fall back to, so
// refuse to build rather than deploy something silently broken.
module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // A relative value is rejected as well as a missing one. '/api/v1' only
    // works behind the dev rewrite; on a Worker it resolves against the Worker's
    // own origin and 404s, which is the exact failure this guard exists to stop.
    if (!apiUrl || !/^https?:\/\//.test(apiUrl)) {
      throw new Error(
        'NEXT_PUBLIC_API_URL must be an absolute URL for a production build ' +
          `(e.g. https://<render-api-host>/api/v1), got ${JSON.stringify(apiUrl)}. ` +
          'Set it as a *build* variable — a runtime variable is applied too ' +
          'late to reach the bundle.',
      );
    }
  }

  return withSentryConfig(nextConfig, sentryOptions);
};
