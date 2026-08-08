import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const BYTES_PER_GB = 1024 ** 3
const DEFAULT_LIMIT_GB = 1 // Supabase free-tier file storage allowance

interface BucketUsageRow {
  bucket_id: string
  total_bytes: number | string
  file_count: number | string
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase.rpc('get_storage_usage')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as BucketUsageRow[]
    const usedBytes = rows.reduce((sum, row) => sum + Number(row.total_bytes), 0)
    const fileCount = rows.reduce((sum, row) => sum + Number(row.file_count), 0)

    const limitGb = Number(process.env.STORAGE_LIMIT_GB) || DEFAULT_LIMIT_GB
    const limitBytes = limitGb * BYTES_PER_GB

    return NextResponse.json({
      usedBytes,
      limitBytes,
      fileCount,
      byBucket: rows.map((row) => ({
        bucketId: row.bucket_id,
        totalBytes: Number(row.total_bytes),
        fileCount: Number(row.file_count),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
