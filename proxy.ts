import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/pin-session'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLogin = path.startsWith('/login')
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const hasValidSession = verifySessionValue(cookieValue)

  if (isLogin && hasValidSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (!isLogin && !hasValidSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    if (cookieValue) {
      response.cookies.set(ADMIN_SESSION_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      })
    }
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
