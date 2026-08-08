import { HardDrive } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import type { StorageUsage } from '@/lib/types'
import Card from '@/components/ui/Card'

const BUCKET_COLORS: Record<string, string> = {
  covers: 'bg-canary',
  songs: 'bg-cobalt',
  profiles: 'bg-lime',
  attachments: 'bg-punch',
}

export default function StorageUsageMeter({ usage }: { usage: StorageUsage }) {
  const percent = usage.limitBytes > 0 ? (usage.usedBytes / usage.limitBytes) * 100 : 0
  const clampedPercent = Math.min(100, Math.max(0, percent))

  const fillColor =
    percent >= 90 ? 'bg-punch' : percent >= 70 ? 'bg-canary' : 'bg-lime'

  return (
    <Card className="px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border-[2.5px] border-ink bg-paper">
          <HardDrive className="h-4 w-4 text-ink" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm uppercase tracking-tight text-ink">Supabase storage</p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            {usage.fileCount} files
          </p>
        </div>
        <p className="font-mono text-xs font-bold text-ink-soft">
          {formatBytes(usage.usedBytes)} / {formatBytes(usage.limitBytes)}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(clampedPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Supabase storage used"
        className="mt-3 h-4 w-full overflow-hidden rounded-md border-[2.5px] border-ink bg-paper"
      >
        <div
          className={`h-full ${fillColor} transition-[width] duration-500`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      {percent >= 90 ? (
        <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-punch">
          Almost full — consider upgrading your Supabase plan or clearing unused files.
        </p>
      ) : null}

      {usage.byBucket.length > 0 ? (
        <div className="mt-4 border-t-2 border-dashed border-ink/30 pt-3">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            By bucket
          </p>
          <ul className="flex flex-col gap-1.5">
            {usage.byBucket.map((bucket) => {
              const share =
                usage.usedBytes > 0 ? (bucket.totalBytes / usage.usedBytes) * 100 : 0

              return (
                <li key={bucket.bucketId} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm border-2 border-ink ${
                      BUCKET_COLORS[bucket.bucketId] ?? 'bg-surface-raised'
                    }`}
                  />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                    {bucket.bucketId}
                  </span>
                  <span className="ml-auto font-mono text-[10px] font-bold text-ink">
                    {formatBytes(bucket.totalBytes)}
                  </span>
                  <span className="w-14 text-right font-mono text-[10px] text-ink-faint">
                    {bucket.fileCount} files · {Math.round(share)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
