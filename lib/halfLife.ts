export function calculateRemainingAmount(
  originalDose: number,
  halfLifeHours: number,
  hoursPassed: number
) {
  return originalDose * Math.pow(0.5, hoursPassed / halfLifeHours)
}

export function getHoursPassed(date: string) {
  const now = new Date().getTime()
  const then = new Date(date).getTime()

  return (now - then) / (1000 * 60 * 60)
}