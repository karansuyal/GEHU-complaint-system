import { describe, expect, it } from 'vitest'
import { parseServerDate } from './date'

describe('parseServerDate', () => {
  it('treats zone-less server timestamps as UTC', () => {
    expect(parseServerDate('2026-09-28T06:24:22').toISOString()).toBe('2026-09-28T06:24:22.000Z')
  })
  it('keeps explicit offsets and handles empty values', () => {
    expect(parseServerDate('2026-09-28T06:24:22+05:30').toISOString()).toBe('2026-09-28T00:54:22.000Z')
    expect(parseServerDate(null)).toBeNull()
  })
})
