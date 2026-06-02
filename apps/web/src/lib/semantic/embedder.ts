'use client'

import type {
  FeatureExtractionPipeline,
  ProgressInfo,
} from '@huggingface/transformers'

export type EmbedStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface EmbedderState {
  status: EmbedStatus
  /** 0..1 download progress while the model installs. */
  progress: number
  error?: string
}

/**
 * Best embedding model under 1GB: mxbai-embed-large-v1 (335M params).
 * fp16 weights are ~669MB; we fall back to the ~337MB int8 build if the
 * WebView can't run fp16. The weights download on first use (a separate phase
 * from installing the app) and are cached locally by Transformers.js, so the
 * engine is offline after the first warm-up.
 */
let modelId =
  process.env.NEXT_PUBLIC_EMBED_MODEL ?? 'mixedbread-ai/mxbai-embed-large-v1'

/** Some retrieval models expect an instruction prefix on the query text. */
let queryPrefix = 'Represent this sentence for searching relevant passages: '

let state: EmbedderState = { status: 'idle', progress: 0 }
let pipe: FeatureExtractionPipeline | null = null
let loadPromise: Promise<FeatureExtractionPipeline | null> | null = null
const listeners = new Set<(s: EmbedderState) => void>()

function setState(next: Partial<EmbedderState>): void {
  state = { ...state, ...next }
  for (const listener of listeners) listener(state)
}

export function getEmbedderState(): EmbedderState {
  return state
}

export function subscribeEmbedder(fn: (s: EmbedderState) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function isEmbedderReady(): boolean {
  return state.status === 'ready' && pipe !== null
}

/** The embedding model id currently configured. */
export function getEmbedModel(): string {
  return modelId
}

/**
 * Selects which embedding model to load (driven by the active plan tier). When
 * the model id changes, the current pipeline is discarded and the next
 * `startEmbedderInstall()` downloads the new one. Calling with the same id is a
 * no-op so an in-flight or ready model isn't interrupted.
 */
export function configureEmbedder(opts: {
  modelId: string
  queryPrefix?: string
}): void {
  queryPrefix = opts.queryPrefix ?? ''
  if (opts.modelId === modelId) return
  modelId = opts.modelId
  pipe = null
  loadPromise = null
  setState({ status: 'idle', progress: 0, error: undefined })
}

/**
 * Kicks off the background install of the offline model. Safe to call multiple
 * times — the download only runs once. Resolves with the pipeline (or null on
 * failure). While this is loading, callers should use Gemini.
 */
export function startEmbedderInstall(): Promise<FeatureExtractionPipeline | null> {
  if (loadPromise) return loadPromise
  if (typeof window === 'undefined') return Promise.resolve(null)

  loadPromise = (async () => {
    setState({ status: 'loading', progress: 0 })
    try {
      const { pipeline, env } = await import('@huggingface/transformers')
      // Pull weights from the hub + browser cache rather than a local path.
      env.allowLocalModels = false

      const onProgress = (info: ProgressInfo): void => {
        if (info.status === 'progress') {
          setState({ progress: Math.min(0.99, info.progress / 100) })
        }
      }

      const targetModel = modelId
      const dtypes: Array<'fp16' | 'q8'> = ['fp16', 'q8']
      let lastError: unknown = null
      for (const dtype of dtypes) {
        try {
          pipe = await pipeline('feature-extraction', targetModel, {
            dtype,
            progress_callback: onProgress,
          })
          break
        } catch (err) {
          lastError = err
          pipe = null
        }
      }
      if (!pipe) throw lastError ?? new Error('Model failed to load')

      setState({ status: 'ready', progress: 1 })
      return pipe
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  })()

  return loadPromise
}

/**
 * Embeds texts into normalized vectors. Returns null if the model isn't ready.
 * Pass isQuery=true for the search text (applies the retrieval prefix); leave
 * false for the documents (icon descriptions, intent exemplars).
 */
export async function embed(
  texts: string[],
  isQuery = false
): Promise<number[][] | null> {
  if (!pipe) return null
  const input = isQuery ? texts.map((t) => queryPrefix + t) : texts
  const output = await pipe(input, { pooling: 'mean', normalize: true })
  return output.tolist() as number[][]
}

/** Cosine similarity of two already-normalized vectors (a plain dot product). */
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0)
  return dot
}
