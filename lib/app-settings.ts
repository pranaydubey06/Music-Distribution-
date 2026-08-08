import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings } from '@/lib/types'

const DEFAULTS: AppSettings = {
  maintenance_mode: false,
  max_upload_mb: 50,
  allowed_image_formats: ['jpg', 'jpeg', 'png', 'webp'],
  allowed_audio_formats: ['wav'],
}

export async function getAppSettings(supabase: SupabaseClient): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('maintenance_mode, max_upload_mb, allowed_image_formats, allowed_audio_formats')
      .eq('id', 'global')
      .single()

    if (error || !data) return DEFAULTS

    return {
      maintenance_mode: data.maintenance_mode ?? DEFAULTS.maintenance_mode,
      max_upload_mb: data.max_upload_mb ?? DEFAULTS.max_upload_mb,
      allowed_image_formats: data.allowed_image_formats ?? DEFAULTS.allowed_image_formats,
      allowed_audio_formats: data.allowed_audio_formats ?? DEFAULTS.allowed_audio_formats,
    }
  } catch {
    return DEFAULTS
  }
}

export { DEFAULTS as DEFAULT_SETTINGS }
