import { useLayoutEffect, useRef, useState } from 'react'
import type { Institution, RequestStatus } from '../types/education'
import { US_STATES } from '../services/educationData/metadata'

interface UniversitySearchProps {
  reportingYear: number
  selectedStateFips: number | null
  onStateChange: (fips: number | null) => void
  query: string
  onQueryChange: (query: string) => void
  institutions: Institution[]
  loadedInstitutionCount: number
  matchCount: number
  directoryStatus: RequestStatus
  directoryError: string | null
  onDirectoryRetry: () => void
  selectedUnitid: number | null
  onInstitutionSelect: (institution: Institution) => void
}

export function UniversitySearch({
  reportingYear,
  selectedStateFips,
  onStateChange,
  query,
  onQueryChange,
  institutions,
  loadedInstitutionCount,
  matchCount,
  directoryStatus,
  directoryError,
  onDirectoryRetry,
  selectedUnitid,
  onInstitutionSelect,
}: UniversitySearchProps) {
  const [resultsOpen, setResultsOpen] = useState(false)
  const [resultsPlacement, setResultsPlacement] = useState<'above' | 'below'>(
    'below',
  )
  const [resultsMaxHeight, setResultsMaxHeight] = useState(288)
  const searchFieldRef = useRef<HTMLDivElement>(null)
  const showResults =
    resultsOpen &&
    directoryStatus === 'ready' &&
    query.trim().length > 0 &&
    matchCount > 0

  // Measure before paint so the menu opens on the correct side without jumping.
  useLayoutEffect(() => {
    if (!showResults) {
      return
    }

    const updatePlacement = () => {
      const field = searchFieldRef.current
      if (!field) {
        return
      }

      const bounds = field.getBoundingClientRect()
      const viewportGap = 16
      const spaceBelow = Math.max(
        0,
        window.innerHeight - bounds.bottom - viewportGap,
      )
      const spaceAbove = Math.max(0, bounds.top - viewportGap)
      // Keep results inside the viewport while using the roomier side of the search field.
      const placement =
        spaceBelow >= 288 || spaceBelow >= spaceAbove ? 'below' : 'above'
      const availableSpace = placement === 'below' ? spaceBelow : spaceAbove

      setResultsPlacement(placement)
      setResultsMaxHeight(Math.min(288, availableSpace))
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement)

    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement)
    }
  }, [showResults])

  return (
    <section className="relative z-20 min-w-0 rounded-3xl border border-outline bg-surface p-6 shadow-[0_12px_42px_rgba(0,0,0,0.3)] sm:p-8">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-surface text-accent">
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-4h4v4"
            />
          </svg>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Institution directory
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">
            Find an institution
          </h2>
        </div>
      </div>

      <label
        className="mb-2 block text-sm font-medium text-text-secondary"
        htmlFor="state-select"
      >
        Choose a state
      </label>
      <select
        className="w-full rounded-xl border border-outline bg-surface-inset px-4 py-3 text-sm text-text-primary outline-none transition focus:border-[#527c5d] focus:ring-4 focus:ring-[#527c5d]/20"
        id="state-select"
        value={selectedStateFips ?? ''}
        onChange={(event) =>
          onStateChange(event.target.value ? Number(event.target.value) : null)
        }
      >
        <option value="">Select a state or district</option>
        {US_STATES.map((state) => (
          <option key={state.fips} value={state.fips}>
            {state.name}
          </option>
        ))}
      </select>
      <p className="mt-3 text-xs leading-5 text-text-muted">
        Results are limited to active, degree-granting, four-year institutions
        in the selected state. Requests are capped to keep searches responsive.
      </p>

      <div className="my-6 h-px bg-outline-subtle" />

      <label
        className="mb-2 block text-sm font-medium text-text-secondary"
        htmlFor="institution-search"
      >
        Search by name or city
      </label>
      <div
        className="relative"
        ref={searchFieldRef}
        onBlur={(event) => {
          // Keep the menu open as keyboard focus moves from the input into a result.
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setResultsOpen(false)
          }
        }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m16 16 4 4" />
        </svg>
        <input
          aria-controls="institution-results"
          aria-expanded={showResults}
          className="w-full rounded-xl border border-outline bg-surface-inset py-3 pl-11 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#527c5d] focus:ring-4 focus:ring-[#527c5d]/20 disabled:cursor-not-allowed disabled:bg-surface-raised"
          disabled={selectedStateFips === null || directoryStatus !== 'ready'}
          id="institution-search"
          onChange={(event) => {
            onQueryChange(event.target.value)
            setResultsOpen(true)
          }}
          onFocus={() => {
            if (query.trim() && directoryStatus === 'ready') {
              setResultsOpen(true)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setResultsOpen(false)
            }
          }}
          placeholder={
            selectedStateFips === null
              ? 'Choose a state first'
              : 'Try “Harvard” or “Amherst”'
          }
          type="search"
          value={query}
        />
        {showResults && (
          <div
            aria-label="Matching institutions"
            className={`absolute left-0 right-0 z-50 flex flex-col overflow-hidden rounded-xl border border-outline bg-surface p-2 shadow-[0_18px_48px_rgba(0,0,0,0.55)] ${
              resultsPlacement === 'above'
                ? 'bottom-[calc(100%+0.5rem)]'
                : 'top-[calc(100%+0.5rem)]'
            }`}
            id="institution-results"
            role="region"
            style={{ maxHeight: `${resultsMaxHeight}px` }}
          >
            <p className="mb-1 shrink-0 rounded-t-lg border-b border-outline-subtle bg-surface px-3 py-2 text-xs font-medium text-text-muted">
              {matchCount > institutions.length
                ? `Showing ${institutions.length} of ${matchCount} matches`
                : `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`}
            </p>
            <ul className="min-h-0 space-y-1 overflow-y-auto overscroll-contain">
              {institutions.map((institution) => (
                <li key={institution.unitid}>
                  <button
                    aria-pressed={selectedUnitid === institution.unitid}
                    className={`group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#6c9274] ${
                      selectedUnitid === institution.unitid
                        ? 'border-accent-outline bg-accent-surface'
                        : 'border-transparent bg-surface hover:border-outline hover:bg-surface-raised'
                    }`}
                    onClick={() => {
                      onInstitutionSelect(institution)
                      setResultsOpen(false)
                    }}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text-primary">
                        {institution.name}
                      </span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {institution.city ?? 'Location unavailable'}
                        {institution.stateAbbreviation
                          ? `, ${institution.stateAbbreviation}`
                          : ''}
                        {' · '}
                        {institutionType(institution.control)}
                      </span>
                    </span>
                    <svg
                      aria-hidden="true"
                      className="size-4 shrink-0 text-accent transition group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div aria-live="polite" className="mt-4">
        {directoryStatus === 'idle' && (
          <p className="rounded-xl bg-surface-inset px-4 py-4 text-sm leading-6 text-text-muted">
            Select a state to load its institution directory.
          </p>
        )}
        {directoryStatus === 'loading' && (
          <p className="flex items-center gap-3 rounded-xl bg-surface-inset px-4 py-4 text-sm text-text-secondary">
            <span className="size-4 animate-spin rounded-full border-2 border-outline border-t-[#8ebc93]" />
            Loading the {reportingYear} {selectedStateName(selectedStateFips)} directory…
          </p>
        )}
        {directoryStatus === 'error' && (
          <div
            className="rounded-xl border border-error-outline bg-error-surface px-4 py-3 text-sm leading-6 text-error-text"
            role="alert"
          >
            <p>{directoryError}</p>
            <button
              className="mt-2 font-semibold underline decoration-error-outline underline-offset-2 hover:text-[#ffd0c4]"
              onClick={onDirectoryRetry}
              type="button"
            >
              Try again
            </button>
          </div>
        )}
        {directoryStatus === 'ready' && !query.trim() && (
          <p className="rounded-xl bg-surface-inset px-4 py-4 text-sm leading-6 text-text-muted">
            {loadedInstitutionCount} institutions loaded. Enter a name or city
            to search.
          </p>
        )}
        {directoryStatus === 'ready' && query.trim() && matchCount === 0 && (
          <p className="rounded-xl bg-surface-inset px-4 py-4 text-sm leading-6 text-text-muted">
            No institutions found. Try another spelling or search by city.
          </p>
        )}
      </div>

      <p className="mt-5 border-t border-outline-subtle pt-4 text-xs text-text-muted">
        IPEDS reporting year: {reportingYear}
      </p>
    </section>
  )
}

function selectedStateName(fips: number | null): string {
  return US_STATES.find((state) => state.fips === fips)?.name ?? 'selected state'
}

function institutionType(control: number | null): string {
  switch (control) {
    case 1:
      return 'Public'
    case 2:
      return 'Private nonprofit'
    case 3:
      return 'Private for-profit'
    default:
      return 'Institution type unavailable'
  }
}
