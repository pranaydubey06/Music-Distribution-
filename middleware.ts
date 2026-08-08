import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Maintenance mode check.
 *
 * We call our /api/settings endpoint to check maintenance_mode.
 * We only block /dashboard routes; the admin panel and login gateway remain accessible.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only enforce on artist-facing dashboard pages.
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  try {
    const settingsUrl = new URL('/api/settings', request.url)
    const res = await fetch(settingsUrl.toString(), {
      cache: 'no-store',
      headers: {
        'x-proxy-internal': '1',
      },
      signal: AbortSignal.timeout(3000),
    })

    if (res.ok) {
      const settings = await res.json()
      if (settings.maintenance_mode) {
        return NextResponse.redirect(new URL('/maintenance', request.url))
      }
    }
  } catch {
    // If we can't reach the settings endpoint, fail open.
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
