import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)

    // Refresh session if it exists
    const { data: { session } } = await supabase.auth.getSession()

    // If there's no session and the user is trying to access a protected route
    if (!session && (
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/upload')
    )) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // Return the original response if there's an error
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/upload/:path*']
} 