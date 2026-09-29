import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useDebounce from './useDebounce'
import useCooldown from './useCooldown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebounce', () => {
  it('only updates after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } })
    rerender({ v: 'ab' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('ab')
  })
})

describe('useCooldown', () => {
  it('counts down and survives a remount (reload)', () => {
    const first = renderHook(() => useCooldown('otp'))
    act(() => first.result.current[1](30))
    expect(first.result.current[0]).toBe(30)
    first.unmount()
    act(() => vi.advanceTimersByTime(10_000))
    const second = renderHook(() => useCooldown('otp'))
    expect(second.result.current[0]).toBe(20)
  })
})
