export interface CapabilityEntry {
  capability: string
  willingness: string
  condition?: string | null
  // legacy format support
  type?: string
  description?: string
}

export interface ValueExchangeAsset {
  asset: string
  category: string
  notes?: string
}

export interface UserAsset {
  asset: string
  category: string
}

export interface ValueExchangeSuggestion {
  strategy: string
  reasoning: string
  userAssetUsed: string | null
  stakeholderMotivator: string
  feasibility: 'high' | 'medium' | 'low'
}

export interface SuggestedStakeholder {
  stakeholderId: string
  name: string
  organization: string | null
  role: string | null
  capabilities: CapabilityEntry[]
  relevanceScore: number
  valueExchangeSuggestions: ValueExchangeSuggestion[]
}
