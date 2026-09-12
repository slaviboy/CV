const monthFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2013-08" → "Aug 2013" */
export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number)
  if (!year || !month) return isoMonth
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
}

/** "2013-08" + "2017-09" → "Aug 2013 – Sep 2017"; a missing end means "Present". */
export function formatMonthRange(start: string, end?: string): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`
}
