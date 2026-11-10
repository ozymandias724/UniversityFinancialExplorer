import { lazy, Suspense, useMemo, useState } from 'react'
import { UniversitySearch } from './components/UniversitySearch'
import { useUniversityData } from './hooks/useUniversityData'
import {
  REPORTING_YEARS,
  SEARCH_RESULT_LIMIT,
  US_STATES,
} from './services/educationData/metadata'
import type { FinanceRecord } from './types/education'

// Load the chart code only when a financial record is ready to display.
const FinancialBreakdown = lazy(() =>
  import('./components/FinancialBreakdown').then((module) => ({
    default: module.FinancialBreakdown,
  })),
)

// These are the headline figures shown before the more detailed charts.
const financialMetrics = [
  { key: 'total_revenues_additions', label: 'Total revenues and additions' },
  { key: 'total_expenses_deductions', label: 'Total expenses and deductions' },
  { key: 'income_net', label: 'Reported net income' },
  { key: 'assets', label: 'Total assets' },
  { key: 'liabilities', label: 'Total liabilities' },
  { key: 'endowment_end', label: 'Ending endowment' },
] as const satisfies ReadonlyArray<{
  key: keyof FinanceRecord
  label: string
}>

// Format reported values consistently; missing values remain unavailable rather than becoming zero.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export default function App() {
  // The search text belongs to this page; the hook manages API data and selections.
  const [query, setQuery] = useState('')
  const {
    reportingYear,
    selectedStateFips,
    institutions,
    directoryStatus,
    directoryError,
    selectedInstitution,
    financeRecord,
    financeStatus,
    financeError,
    selectState,
    selectReportingYear,
    selectInstitution,
    retryDirectory,
    retryFinance,
  } = useUniversityData()

  // Filter the already-loaded state directory locally to avoid extra API requests.
  const matchingInstitutions = useMemo(() => {
    // The API has no name filter, so search only the already bounded state directory.
    const searchTerms = normalize(query.trim())
      .split(/\s+/)
      .filter(Boolean)
      // Map a common abbreviation to the API's official "University of Massachusetts" name.
      .map((term) => (term === 'umass' ? 'massachusetts' : term))
    if (searchTerms.length === 0 || directoryStatus !== 'ready') {
      return []
    }

    return institutions.filter((institution) => {
      const searchableText = normalize(
        `${institution.name} ${institution.city ?? ''}`,
      )
      return searchTerms.every((term) => searchableText.includes(term))
    })
  }, [directoryStatus, institutions, query])

  const handleStateChange = (fips: number | null) => {
    setQuery('')
    selectState(fips)
  }

  // Page flow: choose a year and school, view its financial profile, then see the data source.
  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Branding and reporting-year selection */}
      <header className="border-b border-outline-subtle bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <a className="flex items-center gap-3 no-underline" href="/" aria-label="University Financial Explorer home">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#244b35] text-white">
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
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-text-primary">
                University Financial Explorer
              </span>
              <span className="mt-0.5 block text-xs text-text-muted">
                Higher education, made clearer
              </span>
            </span>
          </a>
          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            Reporting year
            <select
              aria-label="Reporting year"
              className="rounded-lg border border-outline bg-surface-inset px-3 py-2 text-sm font-semibold text-accent outline-none focus:border-[#527c5d] focus:ring-4 focus:ring-[#527c5d]/20"
              onChange={(event) => selectReportingYear(Number(event.target.value))}
              value={reportingYear}
            >
              {REPORTING_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* Introduction and institution search */}
      <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <section className="mb-9 grid min-w-0 items-center gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Institutional finance, in context
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.035em] text-text-primary sm:text-4xl">
              Follow the numbers behind higher education.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
              Choose a reporting year and state, then find a college or
              university to explore its reported financial profile. State
              filters keep every directory request focused and fast.
            </p>
          </div>
          <UniversitySearch
            directoryError={directoryError}
            directoryStatus={directoryStatus}
            institutions={matchingInstitutions.slice(0, SEARCH_RESULT_LIMIT)}
            loadedInstitutionCount={institutions.length}
            matchCount={matchingInstitutions.length}
            onDirectoryRetry={retryDirectory}
            onInstitutionSelect={selectInstitution}
            onQueryChange={setQuery}
            onStateChange={handleStateChange}
            query={query}
            reportingYear={reportingYear}
            selectedStateFips={selectedStateFips}
            selectedUnitid={selectedInstitution?.unitid ?? null}
          />
        </section>

        {/* The profile handles the selected school's loading, error, and data states. */}
        <FinancialProfile
          financeError={financeError}
          financeRecord={financeRecord}
          financeStatus={financeStatus}
          institutionName={selectedInstitution?.name ?? null}
          onRetry={retryFinance}
          reportingYear={reportingYear}
          stateFips={selectedStateFips}
        />

        {/* Credit the data source and clarify how missing values are presented. */}
        <footer className="mt-10 flex flex-col gap-2 border-t border-outline-subtle pt-5 text-xs leading-5 text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Data: Integrated Postsecondary Education Data System (IPEDS), via the{' '}
            <a
              className="font-medium text-accent underline decoration-[#55775b] underline-offset-2 hover:text-[#b0d7b4]"
              href="https://educationdata.urban.org/"
              rel="noreferrer"
              target="_blank"
            >
              Urban Institute Education Data API
            </a>
            .
          </p>
          <p>Missing values are shown as unavailable, not zero.</p>
        </footer>
      </main>
    </div>
  )
}

interface FinancialProfileProps {
  institutionName: string | null
  reportingYear: number
  stateFips: number | null
  financeStatus: 'idle' | 'loading' | 'ready' | 'error'
  financeError: string | null
  financeRecord: FinanceRecord | null
  onRetry: () => void
}

function FinancialProfile({
  institutionName,
  reportingYear,
  stateFips,
  financeStatus,
  financeError,
  financeRecord,
  onRetry,
}: FinancialProfileProps) {
  const stateName =
    US_STATES.find((state) => state.fips === stateFips)?.name ?? null

  // The profile below handles the empty, loading, error, unavailable, and data views.
  return (
    <section className="min-h-[510px] min-w-0 overflow-hidden rounded-3xl border border-outline bg-surface shadow-[0_12px_42px_rgba(0,0,0,0.3)]">
      <div className="border-b border-outline-subtle px-6 py-6 sm:px-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Financial profile
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
          {institutionName ?? 'Your institution, at a glance'}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {institutionName
            ? `IPEDS reporting year ${reportingYear}`
            : 'Select an institution to retrieve its finance record.'}
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {!institutionName && (
          <div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl bg-surface-inset px-6 text-center">
            <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-surface-raised text-accent shadow-sm">
              <svg
                aria-hidden="true"
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"
                />
              </svg>
            </span>
            <h3 className="text-base font-semibold text-text-primary">
              A clearer view starts here
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">
              {stateName
                ? `Search ${stateName} institutions, then choose one to see reported financial figures.`
                : 'Choose a state, search for a school, and select it to see reported financial figures.'}
            </p>
          </div>
        )}

        {institutionName && financeStatus === 'loading' && (
          <div
            aria-live="polite"
            className="flex min-h-[250px] items-center justify-center gap-3 text-sm text-text-secondary"
          >
            <span className="size-4 animate-spin rounded-full border-2 border-outline border-t-[#8ebc93]" />
            Retrieving the finance record…
          </div>
        )}

        {institutionName && financeStatus === 'error' && (
          <div
            className="rounded-xl border border-error-outline bg-error-surface px-4 py-4 text-sm leading-6 text-error-text"
            role="alert"
          >
            <p>{financeError}</p>
            <button
              className="mt-2 font-semibold underline decoration-error-outline underline-offset-2 hover:text-[#ffd0c4]"
              onClick={onRetry}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {institutionName && financeStatus === 'ready' && !financeRecord && (
          <div className="rounded-xl border border-outline-subtle bg-surface-inset px-4 py-4 text-sm leading-6 text-text-secondary">
            {/* No record means data is unavailable for this year, not that the institution had no activity. */}
            No finance record is available for this institution in {reportingYear}.
            That does not mean the institution has no financial activity.
          </div>
        )}

        {institutionName && financeStatus === 'ready' && financeRecord && (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                Reported figures · {financeRecord.year}
              </p>
              <span className="rounded-full bg-accent-surface px-3 py-1 text-xs font-medium text-accent">
                UNITID {financeRecord.unitid}
              </span>
            </div>
            {/* Show unavailable values as text rather than implying they are zero. */}
            <div className="grid gap-3 sm:grid-cols-2">
              {financialMetrics.map((metric, index) => {
                const value = financeRecord[metric.key]
                return (
                  <article
                    className={`rounded-2xl border p-4 ${
                      index === 0
                        ? 'border-accent-outline bg-accent-surface'
                        : 'border-outline-subtle bg-surface-raised'
                    }`}
                    key={metric.key}
                  >
                    <p className="text-xs font-medium text-text-muted">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
                      {typeof value === 'number'
                        ? currencyFormatter.format(value)
                        : 'Not reported'}
                    </p>
                  </article>
                )
              })}
            </div>
            {financeRecord.est_fte !== null && (
              <p className="mt-4 rounded-xl bg-surface-inset px-4 py-3 text-sm text-text-secondary">
                Estimated full-time equivalent enrollment:{' '}
                <span className="font-semibold text-text-primary">
                  {new Intl.NumberFormat('en-US').format(financeRecord.est_fte)}
                </span>
              </p>
            )}
            {/* Charts are split into a separate bundle and appear only for a valid record. */}
            <Suspense
              fallback={
                <p className="mt-8 border-t border-outline-subtle pt-5 text-sm text-text-muted">
                  Loading category charts…
                </p>
              }
            >
              <FinancialBreakdown record={financeRecord} />
            </Suspense>
            <p className="mt-4 text-xs leading-5 text-text-muted">
              Values are reported by IPEDS. Categories may reflect different
              accounting treatments; the selected categories are not summed.
            </p>
          </>
        )}
      </div>
    </section>
  )
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US')
}
