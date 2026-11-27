import { useEffect, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { getDocumentUrl, isPdfDocument } from '@/lib/applicationDocuments'

/**
 * Resolves a document's storage path to a viewable URL. Keyed on the path string, so the
 * applications list being replaced by polling doesn't refetch it.
 */
function useDocumentUrl(path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let cancelled = false
    setLoading(true)
    getDocumentUrl(path).then(resolved => {
      if (!cancelled) {
        setUrl(resolved)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [path])

  return { url, loading }
}

interface ApplicationDocumentPreviewProps {
  path: string | undefined
  alt: string
  imageClassName: string
  /** Shown when there is no document, or it can't be loaded. */
  fallback: React.ReactNode
}

export function ApplicationDocumentPreview({ path, alt, imageClassName, fallback }: ApplicationDocumentPreviewProps) {
  const { url, loading } = useDocumentUrl(path)

  if (!path) return <>{fallback}</>
  if (loading) {
    return (
      <div className="h-16 flex items-center justify-center text-muted-foreground" aria-label={`Loading ${alt}`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (!url) return <>{fallback}</>
  if (isPdfDocument(path)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        <FileText className="h-5 w-5" />
        Open {alt} (PDF)
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={`Open ${alt} full size`}>
      <img src={url} alt={alt} className={imageClassName} />
    </a>
  )
}
