// What Premium unlocks in the Ulat (reports) screen. Free vendors keep Today and
// This Week; the year-to-date report and CSV export need an active license.
// Nothing is hidden by deleting data: sales stay on the device either way.
export const PREMIUM_PERIODS = ['month']

export function isPeriodLocked(period, isPremium) {
  return !isPremium && PREMIUM_PERIODS.includes(period)
}

export function canExportCsv(isPremium) {
  return !!isPremium
}
