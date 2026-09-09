import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpUrl, localDate, required } from './ui'

afterEach(() => vi.useRealTimers())

describe('workspace input validation', () => {
  it('rejects whitespace-only required fields', () => {
    expect(required('  \n ')).not.toBe(true)
    expect(required('订阅名称')).toBe(true)
  })

  it('accepts HTTP service endpoints including local ports', () => {
    expect(httpUrl('http://192.168.1.10:9091/transmission/rpc')).toBe(true)
    expect(httpUrl('https://example.com/feed.xml')).toBe(true)
  })

  it('rejects incomplete URLs and executable or local-file protocols', () => {
    for (const value of ['example.com', 'https://', 'javascript:alert(1)', 'file:///tmp/feed.xml']) {
      expect(httpUrl(value)).not.toBe(true)
    }
  })
})

describe('local calendar date filters', () => {
  it('uses the local day at midnight instead of the UTC calendar day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 0, 15))
    expect(localDate()).toBe('2026-01-01')
    expect(localDate(1)).toBe('2025-12-31')
  })

  it('handles leap days when selecting a previous date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 1, 12))
    expect(localDate(1)).toBe('2024-02-29')
  })
})
