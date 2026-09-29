import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'
import Pagination from './Pagination'
import FilterChips from './FilterChips'
import SegmentedControl from './SegmentedControl'

describe('StatusBadge', () => {
  it('shows a human label for the status', () => {
    render(<StatusBadge status="in_progress" />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('renders nothing without results and disables edges', () => {
    const { container } = render(<Pagination page={1} pages={1} total={0} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('calls onChange with the next page', () => {
    const onChange = vi.fn()
    render(<Pagination page={1} pages={3} total={50} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})

describe('FilterChips', () => {
  it('marks the active chip and reports clicks', () => {
    const onChange = vi.fn()
    render(<FilterChips options={[['', 'All'], ['pending', 'Pending']]} value="" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    expect(onChange).toHaveBeenCalledWith('pending')
  })
})

describe('SegmentedControl', () => {
  it('does not fire for the already-selected option, and is disableable', () => {
    const onChange = vi.fn()
    const opts = [['a', 'A'], ['b', 'B']]
    const { rerender } = render(<SegmentedControl options={opts} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'A' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith('b')
    rerender(<SegmentedControl options={opts} value="a" onChange={onChange} disabled />)
    expect(screen.getByRole('radio', { name: 'B' })).toBeDisabled()
  })
})
