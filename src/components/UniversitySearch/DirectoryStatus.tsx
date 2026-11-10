import { US_STATES } from '../../services/educationData/metadata'
import type { RequestStatus } from '../../types/education'

// The parent supplies request state and counts; this component only presents
// directory feedback and invokes the provided retry action.
interface DirectoryStatusProps {
  status: RequestStatus
  error: string | null
  onRetry: () => void
  reportingYear: number
  selectedStateFips: number | null
  query: string
  loadedInstitutionCount: number
  matchCount: number
}

export function DirectoryStatus({
  status,
  error,
  onRetry,
  reportingYear,
  selectedStateFips,
  query,
  loadedInstitutionCount,
  matchCount,
}: DirectoryStatusProps) {
  return (
    <div aria-live="polite" className="mt-4">
      {status === 'idle' && (
        <p className="rounded-xl bg-surface-inset px-4 py-4 text-sm leading-6 text-text-muted">
          Select a state to load its institution directory.
        </p>
      )}
      {status === 'loading' && (
        <p className="flex items-center gap-3 rounded-xl bg-surface-inset px-4 py-4 text-sm text-text-secondary">
          <span className="size-4 animate-spin rounded-full border-2 border-outline border-t-[#8ebc93]" />
          Loading the {reportingYear} {selectedStateName(selectedStateFips)} directory…
        </p>
      )}
      {status === 'error' && (
        <div
          className="rounded-xl border border-error-outline bg-error-surface px-4 py-3 text-sm leading-6 text-error-text"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="mt-2 font-semibold underline decoration-error-outline underline-offset-2 hover:text-[#ffd0c4]"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && !query.trim() && (
        <p className="rounded-xl bg-surface-inset px-4 py-4 text-sm leading-6 text-text-muted">
          {loadedInstitutionCount} institutions loaded. Enter a name or city
          to search.
        </p>
      )}
      {status === 'ready' && query.trim() && matchCount === 0 && (
        <p className="rounded-xl bg-surface-inset px-4 py-4 text-sm leading-6 text-text-muted">
          No institutions found. Try another spelling or search by city.
        </p>
      )}
    </div>
  )
}

function selectedStateName(fips: number | null): string {
  return US_STATES.find((state) => state.fips === fips)?.name ?? 'selected state'
}
