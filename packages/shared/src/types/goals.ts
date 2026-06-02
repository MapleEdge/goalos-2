export interface ValueRow {
  id: string
  label: string
  rank: number
  description: string | null
  tags: string[]
}

export interface GoalSuggestion {
  title: string
  description: string
  reasoning: string
  alignedValues: string[]
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}
