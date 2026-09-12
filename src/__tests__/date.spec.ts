import { describe, expect, it } from 'vitest'

import { formatMonth, formatMonthRange } from '../utils/date'

describe('date formatting', () => {
  it('formats ISO months', () => {
    expect(formatMonth('2013-08')).toBe('Aug 2013')
    expect(formatMonth('invalid')).toBe('invalid')
  })

  it('formats ranges, including open-ended ones', () => {
    expect(formatMonthRange('2008-09', '2013-05')).toBe('Sep 2008 – May 2013')
    expect(formatMonthRange('2021-01')).toBe('Jan 2021 – Present')
  })
})
