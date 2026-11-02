export type Level = 0 | 1 | 2 | 3 | 4

declare module 'claude-code' {
  interface PluginState {
    team: { level: Level }
  }
}
