export type Level = 'leicht' | 'design' | 'voll'

declare module 'claude-code' {
  interface PluginState {
    'frontend-team': { isActive: boolean; level: Level }
  }
}
