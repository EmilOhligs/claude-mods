export type Bucket = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  turns: number
}

export type RateLimit = { kind: string; percentUsed: number; /** ISO time the window resets. */ resetsAt?: string }

export type Stats = {
  /** Token buckets by `<role>|<model>`; role is `main` (CEO) or `agent` (team). */
  rows: Record<string, Bucket>
  /** Model of the last main-thread turn. */
  mainModel?: string
  contextPercent?: number
  rateLimits: RateLimit[]
  costUsd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'frontend-team': { stats: Stats; isHidden: boolean; isOpen: boolean; isActive: boolean; level: 'leicht' | 'design' | 'voll' }
  }
}
