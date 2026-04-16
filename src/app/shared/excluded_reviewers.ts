const raw = (import.meta.env.VITE_EXCLUDED_REVIEWERS as string | undefined) || ''

const excludedSet = new Set(
  raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0),
)

export function isExcludedReviewer(login: string | null | undefined): boolean {
  if (!login) return false
  return excludedSet.has(login.toLowerCase())
}

export function excludedReviewerLogins(): string[] {
  return Array.from(excludedSet)
}
