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
  return (
    <section className="min-w-0 rounded-3xl border border-[#e1e6df] bg-white p-6 shadow-[0_12px_42px_rgba(27,48,38,0.05)] sm:p-8">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f0e9] text-[#315940]">
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
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#63806c]">
            Institution directory
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-[#17241f]">
            Find an institution
          </h2>
        </div>
      </div>

      <label
        className="mb-2 block text-sm font-medium text-[#34473c]"
        htmlFor="state-select"
      >
        Choose a state
      </label>
      <select
        className="w-full rounded-xl border border-[#dce3db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#20372a] outline-none transition focus:border-[#527c5d] focus:ring-4 focus:ring-[#527c5d]/10"
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

      <p className="mt-3 text-xs leading-5 text-[#6b7b70]">
        {/* Explain the required scope to users; name search happens locally after this bounded fetch. */}
        Results are limited to active, degree-granting, four-year institutions
        in the selected state. Requests are capped to keep searches responsive.
      </p>

      <div className="my-6 h-px bg-[#edf0eb]" />

      <label
        className="mb-2 block text-sm font-medium text-[#34473c]"
        htmlFor="institution-search"
      >
        Search by name or city
      </label>
      <div className="relative">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#819087]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m16 16 4 4" />
        </svg>
        <input
          className="w-full rounded-xl border border-[#dce3db] bg-white py-3 pl-11 pr-4 text-sm text-[#20372a] outline-none transition placeholder:text-[#97a39a] focus:border-[#527c5d] focus:ring-4 focus:ring-[#527c5d]/10 disabled:cursor-not-allowed disabled:bg-[#f5f7f4]"
          disabled={selectedStateFips === null || directoryStatus !== 'ready'}
          id="institution-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            selectedStateFips === null
              ? 'Choose a state first'
              : 'Try “Harvard” or “Amherst”'
          }
          type="search"
          value={query}
        />
      </div>

      <div aria-live="polite" className="mt-5 min-h-20">
        {directoryStatus === 'idle' && (
          <p className="rounded-xl bg-[#f7f9f6] px-4 py-4 text-sm leading-6 text-[#718078]">
            Select a state to load its institution directory.
          </p>
        )}
        {directoryStatus === 'loading' && (
          <p className="flex items-center gap-3 rounded-xl bg-[#f7f9f6] px-4 py-4 text-sm text-[#52645a]">
            <span className="size-4 animate-spin rounded-full border-2 border-[#c8d6ca] border-t-[#416b4d]" />
            Loading the {reportingYear} {selectedStateName(selectedStateFips)} directory…
          </p>
        )}
        {directoryStatus === 'error' && (
          <div
            className="rounded-xl border border-[#f0d7d1] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#8e3f31]"
            role="alert"
          >
            <p>{directoryError}</p>
            <button
              className="mt-2 font-semibold underline decoration-[#d9a79c] underline-offset-2 hover:text-[#60291f]"
              onClick={onDirectoryRetry}
              type="button"
            >
              Try again
            </button>
          </div>
        )}
        {directoryStatus === 'ready' && !query.trim() && (
          <p className="rounded-xl bg-[#f7f9f6] px-4 py-4 text-sm leading-6 text-[#718078]">
            {loadedInstitutionCount} institutions loaded. Enter a name or city
            to search.
          </p>
        )}
        {directoryStatus === 'ready' && query.trim() && matchCount === 0 && (
          <p className="rounded-xl bg-[#f7f9f6] px-4 py-4 text-sm leading-6 text-[#718078]">
            No institutions found. Try another spelling or search by city.
          </p>
        )}
        {directoryStatus === 'ready' && matchCount > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-[#718078]">
              {matchCount > institutions.length
                ? `Showing ${institutions.length} of ${matchCount} matches`
                : `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`}
            </p>
            <ul className="space-y-2">
              {institutions.map((institution) => (
                <li key={institution.unitid}>
                  <button
                    aria-pressed={selectedUnitid === institution.unitid}
                    className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selectedUnitid === institution.unitid
                        ? 'border-[#6c9274] bg-[#f0f6f0]'
                        : 'border-[#e8ece7] bg-white hover:border-[#b8caba] hover:bg-[#fbfcfa]'
                    }`}
                    onClick={() => onInstitutionSelect(institution)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#263b2e]">
                        {institution.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#718078]">
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
                      className="size-4 shrink-0 text-[#73877a] transition group-hover:translate-x-0.5"
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

      <p className="mt-5 border-t border-[#edf0eb] pt-4 text-xs text-[#819087]">
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
