import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/pin-session'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLogin = path.startsWith('/login')
  const hasSessionCookie = !!request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!isLogin && !hasSessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
