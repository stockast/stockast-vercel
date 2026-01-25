export function getKstNow(now: Date = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
}

// "Edition" date in KST; before cutoffHour uses previous day.
export function kstEditionYmd(now: Date = new Date(), cutoffHour: number = 8) {
  const kst = getKstNow(now)
  const edition = new Date(kst)
  if (kst.getHours() < cutoffHour) {
    edition.setDate(edition.getDate() - 1)
  }
  return edition.toISOString().slice(0, 10)
}

export function utcDateFromYmd(ymd: string) {
  const d = new Date(ymd)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
