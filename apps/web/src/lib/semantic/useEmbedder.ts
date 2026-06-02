'use client'

import { useSyncExternalStore } from 'react'
import {
  type EmbedderState,
  getEmbedderState,
  startEmbedderInstall,
  subscribeEmbedder,
} from './embedder'

export function useEmbedder(): EmbedderState {
  return useSyncExternalStore(
    subscribeEmbedder,
    getEmbedderState,
    getEmbedderState
  )
}

export { startEmbedderInstall }
