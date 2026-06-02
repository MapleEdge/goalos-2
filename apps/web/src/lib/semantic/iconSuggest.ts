'use client'

import { ICON_LIBRARY } from '@/lib/icons'
import { cosineSim, embed, isEmbedderReady } from './embedder'

interface DocVector {
  name: string
  vec: number[]
}

let docVectors: DocVector[] | null = null
let docPromise: Promise<void> | null = null

function iconDoc(entry: (typeof ICON_LIBRARY)[number]): string {
  return `${entry.label}. ${entry.keywords.join(', ')}`
}

async function ensureDocVectors(): Promise<void> {
  if (docVectors || !isEmbedderReady()) return
  if (!docPromise) {
    docPromise = (async () => {
      const vecs = await embed(ICON_LIBRARY.map(iconDoc), false)
      if (vecs) {
        docVectors = ICON_LIBRARY.map((entry, i) => ({
          name: entry.name,
          vec: vecs[i] ?? [],
        }))
      }
    })()
  }
  await docPromise
}

/** Instant offline fallback used while the model installs. */
export function suggestIconsKeyword(context: string, limit = 8): string[] {
  const tokens = context.toLowerCase().match(/[a-z0-9]+/g) ?? []
  if (tokens.length === 0) {
    return ICON_LIBRARY.slice(0, limit).map((e) => e.name)
  }
  const scored = ICON_LIBRARY.map((entry) => {
    const terms = [entry.label.toLowerCase(), ...entry.keywords]
    let score = 0
    for (const token of tokens) {
      for (const term of terms) {
        if (term === token) score += 3
        else if (term.includes(token) || token.includes(term)) score += 1
      }
    }
    return { name: entry.name, score }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.name)
}

/**
 * Ranks icons by relevance to the given context (an item's title +
 * description). Uses the offline embedding model when ready; otherwise falls
 * back to keyword matching.
 */
export async function suggestIcons(
  context: string,
  limit = 8
): Promise<string[]> {
  const trimmed = context.trim()
  if (!trimmed) return ICON_LIBRARY.slice(0, limit).map((e) => e.name)

  if (isEmbedderReady()) {
    await ensureDocVectors()
    if (docVectors) {
      const query = await embed([trimmed], true)
      const qvec = query?.[0]
      if (qvec) {
        return docVectors
          .map((d) => ({ name: d.name, score: cosineSim(qvec, d.vec) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map((s) => s.name)
      }
    }
  }

  return suggestIconsKeyword(trimmed, limit)
}
