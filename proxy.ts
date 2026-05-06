import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy (formerly middleware) to protect all routes except auth-related ones.
 * Checks for Supabase auth tokens in cookies.
 * If no session token is found, redirect to /auth.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  const isPublicRoute =
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/wasm/') ||
    pathname.startsWith('/dict/') ||
    pathname.startsWith('/scripts/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.zip') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check for Supabase auth session tokens in cookies
  // Supabase stores session in cookies prefixed with 'sb-'
  const cookies = request.cookies
  const hasSession = Array.from(cookies.getAll()).some(
    (cookie) =>
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  )

  if (!hasSession) {
    const authUrl = new URL('/auth', request.url)
    return NextResponse.redirect(authUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image).*)',
  ],
}
