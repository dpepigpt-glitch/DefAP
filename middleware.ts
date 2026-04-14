import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require Defensor role
const DEFENSOR_ONLY_PATTERNS = [
  /^\/unidades\/nova$/,
  /^\/unidades\/[^/]+\/tarefas\/nova$/,
  /^\/unidades\/[^/]+\/tarefas\/[^/]+\/editar$/,
  /^\/unidades\/[^/]+\/importar$/,
  /^\/unidades\/[^/]+\/configuracoes/,
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — important: do not add logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes: no auth required
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    // If user is logged in and trying to access /login, redirect to dashboard
    if (user && pathname.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/unidades'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Protected routes: require authentication
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Root redirect
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/unidades'
    return NextResponse.redirect(url)
  }

  // Check if current path is Defensor-only
  const isDefensorOnly = DEFENSOR_ONLY_PATTERNS.some((pattern) =>
    pattern.test(pathname)
  )

  if (isDefensorOnly) {
    // Get user role from metadata (fast — no DB query)
    const role = user.user_metadata?.role ?? 'executor'
    if (role !== 'defensor') {
      const url = request.nextUrl.clone()
      url.pathname = '/unidades'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
