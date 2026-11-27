import { supabase } from '@/lib/supabase'
import type { DocumentKind } from '@/types/database'

/** Private Storage bucket for public-form uploads (migration 020). */
export const APPLICATION_DOCUMENTS_BUCKET = 'application-documents'

/** Largest file the bucket accepts; images are compressed well below this before upload. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

/** A file chosen on the public form, ready to upload. */
export interface ApplicationUpload {
  kind: DocumentKind
  file: Blob
  extension: string
}

const EXTENSIONS_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
}

export function fileExtension(file: Blob, fileName?: string): string {
  const byType = EXTENSIONS_BY_TYPE[file.type]
  if (byType) return byType
  const fromName = fileName?.split('.').pop()?.toLowerCase()
  return fromName && /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : 'bin'
}

/** Object path for one upload. Fixed per application and kind, so a retried upload is a no-op. */
export function applicationDocumentPath(applicationId: string, upload: ApplicationUpload): string {
  return `applications/${applicationId}/${upload.kind}.${upload.extension}`
}

/** Older records kept the file itself (a data: URL) or a full URL in storage_path. */
export function isInlineDocument(path: string): boolean {
  return path.startsWith('data:') || /^https?:\/\//.test(path)
}

export function isPdfDocument(path: string): boolean {
  return path.startsWith('data:application/pdf') || path.toLowerCase().endsWith('.pdf')
}

const SIGNED_URL_SECONDS = 60 * 60
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/** A viewable URL for a stored document; signed URLs are cached until shortly before they expire. */
export async function getDocumentUrl(path: string): Promise<string | null> {
  if (isInlineDocument(path)) return path
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const { data, error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) {
    console.warn('[Documents] Could not load document:', error?.message)
    return null
  }
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_URL_SECONDS - 60) * 1000 })
  return data.signedUrl
}
