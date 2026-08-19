import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    // Files under public/ — sw.js, manifest.json, icons. A logged-out browser
    // must still be able to fetch these. Redirecting /sw.js is especially bad:
    // browsers reject a redirected worker script, so a stale service worker can
    // never be updated or unregistered.
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    return NextResponse.next();
  }

  // CRM-001: redirect to login if no httpOnly accessToken cookie
  const token = request.cookies.get('accessToken');
  if (!token) return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
