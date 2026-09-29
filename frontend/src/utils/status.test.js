import { describe, expect, it } from 'vitest'
import { allowedNext, canChangeStatus, statusOptions } from './status'

describe('status rules (must mirror backend/app/crud/complaint.py)', () => {
  it('warden can move pending -> in_progress/resolved but never to escalated', () => {
    expect(allowedNext('warden', 'pending')).toEqual(['in_progress', 'resolved'])
    expect(allowedNext('warden', 'pending')).not.toContain('escalated')
  })

  it('resolved is final for wardens, admins may only move it to in_progress', () => {
    expect(allowedNext('warden', 'resolved')).toEqual([])
    expect(canChangeStatus('warden', 'resolved')).toBe(false)
    expect(allowedNext('admin', 'resolved')).toEqual(['in_progress'])
  })

  it('an escalated complaint can be taken back to any normal status', () => {
    expect(allowedNext('warden', 'escalated')).toEqual(['pending', 'in_progress', 'resolved'])
  })

  it('picker options keep a stable order and include the current status', () => {
    expect(statusOptions('warden', 'in_progress').map(([v]) => v)).toEqual(['pending', 'in_progress', 'resolved'])
    expect(statusOptions('warden', 'resolved').map(([v]) => v)).toEqual(['resolved'])
    expect(statusOptions('warden', 'escalated').map(([v]) => v)).toEqual(['pending', 'in_progress', 'resolved'])
  })
})
