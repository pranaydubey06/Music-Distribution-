type ClassValue = string | false | null | undefined

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Turns arbitrary text into a safe, lowercase, hyphenated storage path segment. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '') || 'untitled'
  )
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase()
}

/** Formats a byte count as a short human-readable string, e.g. "42.3 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent

  return `${exponent === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[exponent]}`
}

/**
 * Signed whole-day difference between today and a release date.
 * Positive = days remaining, 0 = today, negative = days since release.
 * Returns null if there's no date to compare against.
 */
export function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null

  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/** Short human label for getDaysUntil's result, e.g. "in 5 days", "today", "3 days ago". */
export function formatDaysUntil(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return `In ${days} days`
  return `${Math.abs(days)} days ago`
}
