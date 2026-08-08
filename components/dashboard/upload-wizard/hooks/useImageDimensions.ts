'use client'

import { useCallback, useState } from 'react'

/**
 * Hook to read image dimensions from a File
 * Returns null while loading, dimensions object when done
 */
export function useImageDimensions() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadDimensions = useCallback((file: File): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      setIsLoading(true)
      setError(null)
      setDimensions(null)

      const url = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        URL.revokeObjectURL(url)
        const dims = { width: img.naturalWidth, height: img.naturalHeight }
        setDimensions(dims)
        setIsLoading(false)
        resolve(dims)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        setError('Failed to load image')
        setIsLoading(false)
        resolve(null)
      }

      img.src = url
    })
  }, [])

  const reset = useCallback(() => {
    setDimensions(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return { dimensions, error, isLoading, loadDimensions, reset }
}