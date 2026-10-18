import { expect, test } from 'claude-code/testing'

import { fmt } from './register'

test('fmt abbreviates', () => {
  expect(fmt(950)).toBe('950')
  expect(fmt(12_345)).toBe('12.3k')
  expect(fmt(2_500_000)).toBe('2.5M')
})

test('turn.complete adds usage to the status line', async ($, on) => {
  const seen: (string | undefined)[] = []
  on('ui.status', ($, e) => (seen.push(e.text), { value: undefined }))
  on('turn.complete', () => ({ text: '' }))

  const usage = {
    model: 'claude-opus-5-5',
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_input_tokens: 10_000,
    cache_creation_input_tokens: 0,
  }
  const turn = { answer: 'hi', durationMs: 1, isAborted: false, reason: 'answer', usage } as const
  await $.turn.complete({ ...turn, turnId: 't1' })
  await $.turn.complete({ ...turn, turnId: 't2' })

  expect(seen.at(-1)).toBe('tokens ↑22.0k ↓1.0k')
})
