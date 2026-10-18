export type Totals = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  turns: number
  contextPercent?: number
}

declare module 'claude-code' {
  interface PluginState {
    'token-counter': { totals: Totals }
  }
}
