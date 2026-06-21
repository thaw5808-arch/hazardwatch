import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard');
  if (isProtected && !req.auth) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
