'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'goalos-use-tokens'

interface TokensContextValue {
  tokensEnabled: boolean
  setTokensEnabled: (enabled: boolean) => void
}

const TokensContext = createContext<TokensContextValue>({
  tokensEnabled: true,
  setTokensEnabled: () => {},
})

export function TokensProvider({ children }: { children: ReactNode }) {
  const [tokensEnabled, setTokensEnabledRaw] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'false') setTokensEnabledRaw(false)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const setTokensEnabled = useCallback((enabled: boolean) => {
    setTokensEnabledRaw(enabled)
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      // localStorage unavailable
    }
  }, [])

  return (
    <TokensContext.Provider value={{ tokensEnabled, setTokensEnabled }}>
      {children}
    </TokensContext.Provider>
  )
}

export function useTokens() {
  return useContext(TokensContext)
}
