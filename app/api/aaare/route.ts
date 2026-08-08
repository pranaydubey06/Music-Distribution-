import { NextResponse, NextRequest } from 'next/server'

import * as adminActivityLogs from '@/lib/api-handlers/admin/activity-logs/route'
import * as adminArtists from '@/lib/api-handlers/admin/artists/route'
import * as adminArtistsAccess from '@/lib/api-handlers/admin/artists/[id]/access/route'
import * as adminAuth from '@/lib/api-handlers/admin/auth/route'
import * as adminOverview from '@/lib/api-handlers/admin/overview/route'
import * as adminPayments from '@/lib/api-handlers/admin/payments/route'
import * as adminReleases from '@/lib/api-handlers/admin/releases/route'
import * as adminReleasesId from '@/lib/api-handlers/admin/releases/[id]/route'
import * as adminReleasesCancelDeletion from '@/lib/api-handlers/admin/releases/[id]/cancel-deletion/route'
import * as adminReleasesScheduleDeletion from '@/lib/api-handlers/admin/releases/[id]/schedule-deletion/route'
import * as adminSettings from '@/lib/api-handlers/admin/settings/route'
import * as adminStorage from '@/lib/api-handlers/admin/storage/route'
import * as adminTickets from '@/lib/api-handlers/admin/tickets/route'
import * as adminTicketsId from '@/lib/api-handlers/admin/tickets/[id]/route'
import * as adminTicketsMessages from '@/lib/api-handlers/admin/tickets/[id]/messages/route'
import * as artistAccess from '@/lib/api-handlers/artist-access/route'
import * as artists from '@/lib/api-handlers/artists/route'
import * as artistsId from '@/lib/api-handlers/artists/[id]/route'
import * as paymentsVerify from '@/lib/api-handlers/payments/verify/route'
import * as releases from '@/lib/api-handlers/releases/route'
import * as releasesId from '@/lib/api-handlers/releases/[id]/route'
import * as releasesDuplicate from '@/lib/api-handlers/releases/[id]/duplicate/route'
import * as releasesSubmit from '@/lib/api-handlers/releases/[id]/submit/route'
import * as settings from '@/lib/api-handlers/settings/route'
import * as tickets from '@/lib/api-handlers/tickets/route'
import * as ticketsMessages from '@/lib/api-handlers/tickets/[id]/messages/route'

export const dynamic = 'force-dynamic'

async function handle(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const method = request.method.toUpperCase()
  const resolvedParams = await params
  const slug = resolvedParams.slug || []
  const pathname = '/api/' + slug.join('/')

  let handlerModule: Record<string, unknown> | null = null
  let routeParams: Promise<{ id: string }> = Promise.resolve({ id: '' })

  // 1. Exact matches
  if (pathname === '/api/settings') {
    handlerModule = settings
  } else if (pathname === '/api/artist-access') {
    handlerModule = artistAccess
  } else if (pathname === '/api/artists') {
    handlerModule = artists
  } else if (pathname === '/api/payments/verify') {
    handlerModule = paymentsVerify
  } else if (pathname === '/api/releases') {
    handlerModule = releases
  } else if (pathname === '/api/tickets') {
    handlerModule = tickets
  } else if (pathname === '/api/admin/activity-logs') {
    handlerModule = adminActivityLogs
  } else if (pathname === '/api/admin/artists') {
    handlerModule = adminArtists
  } else if (pathname === '/api/admin/auth') {
    handlerModule = adminAuth
  } else if (pathname === '/api/admin/overview') {
    handlerModule = adminOverview
  } else if (pathname === '/api/admin/payments') {
    handlerModule = adminPayments
  } else if (pathname === '/api/admin/releases') {
    handlerModule = adminReleases
  } else if (pathname === '/api/admin/settings') {
    handlerModule = adminSettings
  } else if (pathname === '/api/admin/storage') {
    handlerModule = adminStorage
  } else if (pathname === '/api/admin/tickets') {
    handlerModule = adminTickets
  } 
  // 2. Pattern matches with :id parameter
  // /api/artists/:id
  else if (slug.length === 2 && slug[0] === 'artists') {
    handlerModule = artistsId
    routeParams = Promise.resolve({ id: slug[1] })
  }
  // /api/releases/:id
  else if (slug.length === 2 && slug[0] === 'releases') {
    handlerModule = releasesId
    routeParams = Promise.resolve({ id: slug[1] })
  }
  // /api/releases/:id/duplicate
  else if (slug.length === 3 && slug[0] === 'releases' && slug[2] === 'duplicate') {
    handlerModule = releasesDuplicate
    routeParams = Promise.resolve({ id: slug[1] })
  }
  // /api/releases/:id/submit
  else if (slug.length === 3 && slug[0] === 'releases' && slug[2] === 'submit') {
    handlerModule = releasesSubmit
    routeParams = Promise.resolve({ id: slug[1] })
  }
  // /api/tickets/:id/messages
  else if (slug.length === 3 && slug[0] === 'tickets' && slug[2] === 'messages') {
    handlerModule = ticketsMessages
    routeParams = Promise.resolve({ id: slug[1] })
  }
  // /api/admin/artists/:id/access
  else if (slug.length === 4 && slug[0] === 'admin' && slug[1] === 'artists' && slug[3] === 'access') {
    handlerModule = adminArtistsAccess
    routeParams = Promise.resolve({ id: slug[2] })
  }
  // /api/admin/releases/:id/cancel-deletion
  else if (slug.length === 4 && slug[0] === 'admin' && slug[1] === 'releases' && slug[3] === 'cancel-deletion') {
    handlerModule = adminReleasesCancelDeletion
    routeParams = Promise.resolve({ id: slug[2] })
  }
  // /api/admin/releases/:id/schedule-deletion
  else if (slug.length === 4 && slug[0] === 'admin' && slug[1] === 'releases' && slug[3] === 'schedule-deletion') {
    handlerModule = adminReleasesScheduleDeletion
    routeParams = Promise.resolve({ id: slug[2] })
  }
  // /api/admin/releases/:id
  else if (slug.length === 3 && slug[0] === 'admin' && slug[1] === 'releases') {
    handlerModule = adminReleasesId
    routeParams = Promise.resolve({ id: slug[2] })
  }
  // /api/admin/tickets/:id/messages
  else if (slug.length === 4 && slug[0] === 'admin' && slug[1] === 'tickets' && slug[3] === 'messages') {
    handlerModule = adminTicketsMessages
    routeParams = Promise.resolve({ id: slug[2] })
  }
  // /api/admin/tickets/:id
  else if (slug.length === 3 && slug[0] === 'admin' && slug[1] === 'tickets') {
    handlerModule = adminTicketsId
    routeParams = Promise.resolve({ id: slug[2] })
  }

  if (handlerModule) {
    const fn = handlerModule[method]
    if (typeof fn === 'function') {
      return fn(request, { params: routeParams })
    }
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug?: string[] }> }) {
  return handle(request, ctx)
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug?: string[] }> }) {
  return handle(request, ctx)
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ slug?: string[] }> }) {
  return handle(request, ctx)
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ slug?: string[] }> }) {
  return handle(request, ctx)
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ slug?: string[] }> }) {
  return handle(request, ctx)
}
