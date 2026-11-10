import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { UniversitySearch } from './components/UniversitySearch/UniversitySearch'
import { useUniversityData } from './hooks/useUniversityData'
import {
  DEFAULT_REPORTING_YEAR,
  SEARCH_RESULT_LIMIT,
  US_STATES,
} from './services/educationData/metadata'
import type {
  FinanceRecord,
  Institution,
  InstitutionSelection,
} from './types/education'

// Page flow: App coordinates draft selections and submission, UniversitySearch
// renders the selection controls, and FinancialProfile below renders the result.
// useUniversityData owns API request state; its services live in services/educationData.

// Load the chart code only when a financial record is ready to display.
const FinancialBreakdown = lazy(() =>
  import('./components/FinancialBreakdown/FinancialBreakdown').then((module) => ({
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

// A submitted comparison keeps its own records, separate from the editable slots.
interface DisplayedComparisonProfile {
  institution: Institution
  reportingYear: number
  financeRecord: FinanceRecord
}

export default function App() {
  // Draft search and slot state. Changes here do not automatically replace
  // the single profile or comparison currently displayed on the page.
  const [query, setQuery] = useState('')
  const [comparisonSlots, setComparisonSlots] = useState<
    [InstitutionSelection, InstitutionSelection]
  >([
    { institution: null, reportingYear: DEFAULT_REPORTING_YEAR },
    { institution: null, reportingYear: DEFAULT_REPORTING_YEAR },
  ])
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0)
  // The mobile comparison tab is independent of the slot being edited.
  const [activeComparisonTab, setActiveComparisonTab] = useState<0 | 1>(0)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [displayedComparison, setDisplayedComparison] = useState<
    [DisplayedComparisonProfile, DisplayedComparisonProfile] | null
  >(null)
  // The hook loads the state/year directory, the submitted single profile,
  // and a finance availability check for each draft institution/year pair.
  const {
    reportingYear,
    financeReportingYear,
    selectedStateFips,
    institutions,
    directoryStatus,
    directoryError,
    selectedInstitution,
    financeRecord,
    financeStatus,
    financeError,
    financeAvailability,
    selectState,
    selectReportingYear,
    selectInstitution,
    retryDirectory,
    retryFinance,
    retryAvailability,
  } = useUniversityData(comparisonSlots)

  // Filter the already-loaded state directory locally to avoid extra API requests.
  // All normalized search terms must match the institution's name or city.
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

  // Changing state, active slot, or its year updates the directory search context.
  // Clear the old query so it is not carried into the new context.
  const handleStateChange = (fips: number | null) => {
    setQuery('')
    selectState(fips)
  }

  const handleSlotChange = (slot: 0 | 1) => {
    setActiveSlot(slot)
    selectReportingYear(comparisonSlots[slot].reportingYear)
    setQuery('')
  }

  // A school may appear in both slots for different years, but not the same
  // school/year pair. The boolean tells UniversitySearch whether to show a warning.
  const handleSlotYearChange = (slot: 0 | 1, year: number): boolean => {
    const otherSelection = comparisonSlots[slot === 0 ? 1 : 0]
    const currentInstitution = comparisonSlots[slot].institution
    if (
      currentInstitution &&
      otherSelection.institution?.unitid === currentInstitution.unitid &&
      otherSelection.reportingYear === year
    ) {
      return false
    }

    setComparisonSlots((current) => {
      const next: [InstitutionSelection, InstitutionSelection] = [...current]
      next[slot] = { ...next[slot], reportingYear: year }
      return next
    })
    setActiveSlot(slot)
    selectReportingYear(year)
    setQuery('')
    return true
  }

  // UniversitySearch reports duplicate choices to the user; guard the update
  // here as well so the draft slots cannot acquire the same school/year pair.
  const handleInstitutionSelect = (institution: Institution) => {
    const currentSelection = comparisonSlots[activeSlot]
    const otherSelection = comparisonSlots[activeSlot === 0 ? 1 : 0]
    if (
      otherSelection.institution?.unitid === institution.unitid &&
      otherSelection.reportingYear === currentSelection.reportingYear
    ) {
      return
    }

    setComparisonSlots((current) => {
      const next: [InstitutionSelection, InstitutionSelection] = [...current]
      next[activeSlot] = { ...next[activeSlot], institution }
      return next
    })
  }

  const handleClearSlot = (slot: 0 | 1) => {
    setComparisonSlots((current) => {
      const next: [InstitutionSelection, InstitutionSelection] = [...current]
      next[slot] = { ...next[slot], institution: null }
      return next
    })
  }

  // Derive submission eligibility from the current drafts and their checks.
  // Match both ID and year so an older check cannot authorize a newer selection.
  const selectedCount = comparisonSlots.filter(
    (selection) => selection.institution !== null,
  ).length
  const allSelectionsAvailable = comparisonSlots.every((selection, index) => {
    if (!selection.institution) {
      return true
    }

    const availability = financeAvailability[index]
    return (
      availability.unitid === selection.institution.unitid &&
      availability.reportingYear === selection.reportingYear &&
      availability.status === 'ready' &&
      availability.hasRecord
    )
  })
  // A single selection uses the hook's profile request. A comparison snapshots
  // the already-checked records so later draft edits do not change the result.
  const handleSubmitSelection = () => {
    if (selectedCount === 1 && allSelectionsAvailable) {
      const selection = comparisonSlots.find(
        (candidate) => candidate.institution !== null,
      )
      if (selection?.institution) {
        setDisplayedComparison(null)
        selectInstitution(selection.institution, selection.reportingYear)
      }
      return
    }

    if (selectedCount === 2 && allSelectionsAvailable) {
      const profiles = comparisonSlots.map((selection, index) => {
        const record = financeAvailability[index].record
        if (!selection.institution || !record) {
          return null
        }
        return {
          institution: selection.institution,
          reportingYear: selection.reportingYear,
          financeRecord: record,
        }
      })
      if (profiles[0] && profiles[1]) {
        setDisplayedComparison([profiles[0], profiles[1]])
        setActiveComparisonTab(0)
      }
    }
  }

  // Page flow: choose a year and school, view its financial profile, then see the data source.
  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Branding */}
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
          {/* UniversitySearch coordinates the search UI. Pass the limited
              results separately from the total match and directory counts. */}
          <UniversitySearch
            directoryError={directoryError}
            directoryStatus={directoryStatus}
            institutions={matchingInstitutions.slice(0, SEARCH_RESULT_LIMIT)}
            loadedInstitutionCount={institutions.length}
            matchCount={matchingInstitutions.length}
            onDirectoryRetry={retryDirectory}
            onActiveSlotChange={handleSlotChange}
            onClearSlot={handleClearSlot}
            onInstitutionSelect={handleInstitutionSelect}
            onQueryChange={setQuery}
            onSubmitSelection={handleSubmitSelection}
            onStateChange={handleStateChange}
            query={query}
            reportingYear={reportingYear}
            selectedStateFips={selectedStateFips}
            selectedInstitutions={comparisonSlots}
            activeSlot={activeSlot}
            selectedUnitid={
              comparisonSlots[activeSlot].institution?.unitid ?? null
            }
            displayedInstitutionName={selectedInstitution?.name ?? null}
            displayedReportingYear={financeReportingYear}
            selectedCount={selectedCount}
            onSlotYearChange={handleSlotYearChange}
            financeAvailability={financeAvailability}
            onAvailabilityRetry={retryAvailability}
            allSelectionsAvailable={allSelectionsAvailable}
          />
        </section>

        {/* Single profiles and submitted comparisons are separate from draft tray selections. */}
        {displayedComparison ? (
          <section aria-label="Institution comparison">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Comparing institutions
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Financial amounts are reported in nominal dollars and are not
                adjusted for inflation.
              </p>
            </div>
            {/* Desktop shows both submitted profiles; mobile mounts only the
                active profile beneath keyboard-accessible comparison tabs. */}
            {isDesktop ? (
              <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                {displayedComparison.map((profile) => (
                  <FinancialProfile
                    compact
                    financeError={null}
                    financeRecord={profile.financeRecord}
                    financeStatus="ready"
                    institutionName={profile.institution.name}
                    key={`${profile.institution.unitid}-${profile.reportingYear}`}
                    reportingYear={profile.reportingYear}
                    stateFips={null}
                  />
                ))}
              </div>
            ) : (
              <>
                <div
                  aria-label="Compared institution profiles"
                  className="sticky top-0 z-30 -mx-5 mb-4 grid grid-cols-2 gap-2 border-b border-outline-subtle bg-page/95 px-5 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.2)] backdrop-blur sm:-mx-8 sm:px-8"
                  role="tablist"
                >
                  {displayedComparison.map((profile, index) => {
                    const tab = index as 0 | 1
                    const selected = activeComparisonTab === tab
                    return (
                      <button
                        aria-controls={`comparison-panel-${tab + 1}`}
                        aria-selected={selected}
                        className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[#6c9274] ${
                          selected
                            ? 'border-accent-outline bg-accent-surface text-text-primary'
                            : 'border-transparent text-text-muted hover:bg-surface-raised'
                        }`}
                        id={`comparison-tab-${tab + 1}`}
                        key={`${profile.institution.unitid}-${profile.reportingYear}-tab`}
                        onClick={() => setActiveComparisonTab(tab)}
                        onKeyDown={(event) => {
                          // Keep selection and keyboard focus together when navigating tabs.
                          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                            event.preventDefault()
                            const nextTab = (tab === 0 ? 1 : 0) as 0 | 1
                            setActiveComparisonTab(nextTab)
                            document
                              .getElementById(`comparison-tab-${nextTab + 1}`)
                              ?.focus()
                          } else if (event.key === 'Home' || event.key === 'End') {
                            event.preventDefault()
                            const nextTab = event.key === 'Home' ? 0 : 1
                            setActiveComparisonTab(nextTab)
                            document
                              .getElementById(`comparison-tab-${nextTab + 1}`)
                              ?.focus()
                          }
                        }}
                        role="tab"
                        tabIndex={selected ? 0 : -1}
                        type="button"
                      >
                        <span className="block truncate font-semibold">
                          {profile.institution.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {profile.reportingYear}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {displayedComparison.map((profile, index) => {
                  const tab = index as 0 | 1
                  return (
                    <div
                      aria-labelledby={`comparison-tab-${tab + 1}`}
                      className="min-w-0"
                      id={`comparison-panel-${tab + 1}`}
                      key={`${profile.institution.unitid}-${profile.reportingYear}-panel`}
                      role="tabpanel"
                      tabIndex={0}
                      hidden={activeComparisonTab !== tab}
                    >
                      {activeComparisonTab === tab && (
                        <FinancialProfile
                          compact
                          financeError={null}
                          financeRecord={profile.financeRecord}
                          financeStatus="ready"
                          institutionName={profile.institution.name}
                          reportingYear={profile.reportingYear}
                          stateFips={null}
                        />
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </section>
        ) : (
          <FinancialProfile
            financeError={financeError}
            financeRecord={financeRecord}
            financeStatus={financeStatus}
            institutionName={selectedInstitution?.name ?? null}
            onRetry={retryFinance}
            reportingYear={financeReportingYear}
            stateFips={selectedStateFips}
          />
        )}

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

// FinancialProfile is shared by the single-result view and the comparison.
// Compact mode fits a profile into one comparison column or mobile tab.
interface FinancialProfileProps {
  compact?: boolean
  institutionName: string | null
  reportingYear: number
  stateFips: number | null
  financeStatus: 'idle' | 'loading' | 'ready' | 'error'
  financeError: string | null
  financeRecord: FinanceRecord | null
  onRetry?: () => void
}

function FinancialProfile({
  compact = false,
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
                ? `Search ${stateName} institutions, add one to a selection, then submit to see its reported financial figures.`
                : 'Choose a state, search for a school, add it to a selection, then submit to see reported financial figures.'}
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
            <div
              className={`grid gap-3 ${
                compact ? '' : 'sm:grid-cols-2'
              }`}
            >
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
            {/* FinancialBreakdown/FinancialBreakdown.tsx owns the coverage donut
                and category charts; load its bundle only for a valid record. */}
            <Suspense
              fallback={
                <p className="mt-8 border-t border-outline-subtle pt-5 text-sm text-text-muted">
                  Loading category charts…
                </p>
              }
            >
              <FinancialBreakdown compact={compact} record={financeRecord} />
            </Suspense>
            <p className="mt-4 text-xs leading-5 text-text-muted">
              Values are reported by IPEDS. Categories may reflect different
              accounting treatments; the selected categories are not summed.
              {compact && ' Amounts are not adjusted for inflation.'}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

// Use the same accent-insensitive, case-insensitive form for queries and names.
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US')
}

// Keep the comparison layout in sync when the viewport crosses the breakpoint.
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const updateMatches = () => setMatches(mediaQuery.matches)
    updateMatches()
    mediaQuery.addEventListener('change', updateMatches)
    return () => mediaQuery.removeEventListener('change', updateMatches)
  }, [query])

  return matches
}
