'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { startEmbedderInstall, useEmbedder } from '@/lib/semantic/useEmbedder'

/**
 * Starts the background install of the offline model and shows a small status
 * chip while it downloads. Until it's ready the app uses Gemini; once ready the
 * offline engine powers icon suggestions and command-bar intent detection.
 */
export function ModelStatus() {
  const { status, progress } = useEmbedder()

  useEffect(() => {
    startEmbedderInstall()
  }, [])

  if (status === 'idle' || status === 'error') return null

  if (status === 'loading') {
    return (
      <div className="pointer-events-none fixed bottom-3 right-3 z-30 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs text-zinc-500 shadow-sm backdrop-blur">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Installing offline model… {Math.round(progress * 100)}%</span>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs text-emerald-700 shadow-sm backdrop-blur">
      <Sparkles className="size-3.5" />
      <span>Offline model ready</span>
    </div>
  )
}
