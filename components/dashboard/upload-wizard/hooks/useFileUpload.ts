'use client'

import { useCallback, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { slugify, getFileExtension } from '@/lib/utils'

interface UploadResult {
  url: string | null
  progress: number // 0-100
  error: string | null
  isUploading: boolean
}

interface UseFileUploadOptions {
  bucket: 'covers' | 'songs' | 'profiles'
  onProgress?: (loaded: number, total: number) => void
}

/**
 * Hook for uploading files to Supabase Storage with progress tracking
 */
export function useFileUpload({ bucket }: UseFileUploadOptions) {
  const [result, setResult] = useState<UploadResult>({
    url: null,
    progress: 0,
    error: null,
    isUploading: false,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      // Reset state
      setResult({ url: null, progress: 0, error: null, isUploading: true })
      abortControllerRef.current = new AbortController()

      try {
        const supabase = getSupabaseBrowserClient()

        // Generate unique path
        const extension = getFileExtension(file.name)
        const baseName = slugify(file.name.replace(`.${extension}`, ''))
        const timestamp = Date.now()
        const path = `${baseName}-${timestamp}.${extension}`

        // Upload with progress
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (error) throw new Error(error.message)

        // Get public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
        const publicUrl = urlData.publicUrl

        setResult({ url: publicUrl, progress: 100, error: null, isUploading: false })
        return publicUrl
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setResult({ url: null, progress: 0, error: 'Upload cancelled', isUploading: false })
          return null
        }
        const message = err instanceof Error ? err.message : 'Upload failed'
        setResult({ url: null, progress: 0, error: message, isUploading: false })
        return null
      }
    },
    [bucket]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setResult({ url: null, progress: 0, error: 'Upload cancelled', isUploading: false })
  }, [])

  return {
    ...result,
    upload,
    cancel,
  }
}

/**
 * Hook for uploading multiple files sequentially with overall progress
 */
export function useMultiFileUpload({ bucket }: UseFileUploadOptions) {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<Array<{ file: File; url: string | null; error: string | null }>>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const uploadAll = useCallback(
    async (fileList: File[]): Promise<Array<{ file: File; url: string | null; error: string | null }>> => {
      setFiles(fileList)
      setIsUploading(true)
      setOverallProgress(0)

      const supabase = getSupabaseBrowserClient()
      const newResults: Array<{ file: File; url: string | null; error: string | null }> = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        try {
          const extension = getFileExtension(file.name)
          const baseName = slugify(file.name.replace(`.${extension}`, ''))
          const timestamp = Date.now()
          const path = `${baseName}-${timestamp}.${extension}`

          const { error } = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          })

          if (error) throw new Error(error.message)

          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
          newResults.push({ file, url: urlData.publicUrl, error: null })
        } catch (err) {
          newResults.push({ file, url: null, error: err instanceof Error ? err.message : 'Upload failed' })
        }

        setResults([...newResults])
        setOverallProgress(((i + 1) / fileList.length) * 100)
      }

      setIsUploading(false)
      return newResults
    },
    [bucket]
  )

  const reset = useCallback(() => {
    setFiles([])
    setResults([])
    setOverallProgress(0)
    setIsUploading(false)
  }, [])

  return {
    files,
    results,
    overallProgress,
    isUploading,
    uploadAll,
    reset,
  }
}
