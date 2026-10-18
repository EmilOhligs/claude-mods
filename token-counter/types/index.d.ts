export type Bucket = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  turns: number
}

export type RateLimit = { kind: string; percentUsed: number }

export type Stats = {
  /** Token buckets by `<role>|<model>`; role is `main` or `agent`. */
  rows: Record<string, Bucket>
  /** Model of the last main-thread turn. */
  mainModel?: string
  contextPercent?: number
  rateLimits: RateLimit[]
  costUsd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'token-counter': { stats: Stats; isHidden: boolean; isOpen: boolean }
  }
}
