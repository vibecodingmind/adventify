import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/verify', '/api/auth/login', '/api/seed', '/api/reset', '/api/route'];

// API routes that handle their own auth (already use requireAuth internally)
const selfAuthRoutes = [
  '/api/persons',
  '/api/baptism-records',
  '/api/certificates',
  '/api/churches',
  '/api/conferences',
  '/api/divisions',
  '/api/unions',
  '/api/analytics',
  '/api/users',
  '/api/audit-logs',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/notifications',
  '/api/email',
  '/api/batch-jobs',
  '/api/templates',
  '/api/reports',
  '/api/revocations',
  '/api/search',
  '/api/ai',
  '/api/member-requests',
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next();
  }

  // Allow verify routes
  if (pathname.startsWith('/verify') || pathname.startsWith('/api/verify')) {
    return NextResponse.next();
  }

  // Allow API routes to handle their own auth
  if (selfAuthRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For all other page routes, check for auth cookie
  const token = req.cookies.get('adventify_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
