const PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/'

/**
 * Extracts { bucket, path } from a Supabase public Storage URL, e.g.
 * "https://xyz.supabase.co/storage/v1/object/public/songs/abc/track.mp3"
 * → { bucket: "songs", path: "abc/track.mp3" }
 *
 * Returns null if the URL doesn't match the expected public-object shape
 * (so callers can skip storage cleanup safely instead of throwing).
 */
export function parseStoragePathFromPublicUrl(
  url: string
): { bucket: string; path: string } | null {
  const markerIndex = url.indexOf(PUBLIC_OBJECT_MARKER)
  if (markerIndex === -1) return null

  const afterMarker = url.slice(markerIndex + PUBLIC_OBJECT_MARKER.length)
  const [bucket, ...pathParts] = afterMarker.split('/')

  if (!bucket || pathParts.length === 0) return null

  try {
    return { bucket, path: decodeURIComponent(pathParts.join('/')) }
  } catch {
    return null
  }
}
