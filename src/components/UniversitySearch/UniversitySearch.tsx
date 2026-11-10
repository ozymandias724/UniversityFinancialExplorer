import { useState } from 'react'
import Select from 'react-select'
import type {
  FinanceAvailability,
  Institution,
  InstitutionSelection,
  RequestStatus,
} from '../../types/education'
import { US_STATES } from '../../services/educationData/metadata'
import { DirectoryStatus } from './DirectoryStatus'
import { InstitutionSearchField } from './InstitutionSearchField'
import { SelectionSlot } from './SelectionSlot'

const stateOptions = US_STATES.map((state) => ({
  value: state.fips,
  label: state.name,
}))

// App.tsx owns the directory data, search query, and draft selections; this
// component coordinates their presentation and duplicate-selection feedback.
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
  selectedInstitutions: [InstitutionSelection, InstitutionSelection]
  activeSlot: 0 | 1
  onActiveSlotChange: (slot: 0 | 1) => void
  onSlotYearChange: (slot: 0 | 1, year: number) => boolean
  onClearSlot: (slot: 0 | 1) => void
  onSubmitSelection: () => void
  displayedInstitutionName: string | null
  displayedReportingYear: number
  selectedCount: number
  financeAvailability: [FinanceAvailability, FinanceAvailability]
  onAvailabilityRetry: (slot: 0 | 1) => void
  allSelectionsAvailable: boolean
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
  selectedInstitutions,
  activeSlot,
  onActiveSlotChange,
  onSlotYearChange,
  onClearSlot,
  onSubmitSelection,
  displayedInstitutionName,
  displayedReportingYear,
  selectedCount,
  financeAvailability,
  onAvailabilityRetry,
  allSelectionsAvailable,
}: UniversitySearchProps) {
  const [duplicateSelection, setDuplicateSelection] = useState(false)

  // Return whether the search field should clear its query and close the results.
  const handleInstitutionSelect = (institution: Institution): boolean => {
    const otherSlot = selectedInstitutions[activeSlot === 0 ? 1 : 0]
    const currentSelection = selectedInstitutions[activeSlot]
    // The same institution is allowed in both slots when the years differ.
    if (
      otherSlot.institution?.unitid === institution.unitid &&
      otherSlot.reportingYear === currentSelection.reportingYear
    ) {
      setDuplicateSelection(true)
      return false
    }

    setDuplicateSelection(false)
    onInstitutionSelect(institution)
    return true
  }

  return (
    <section className="relative z-20 min-w-0 rounded-3xl border border-outline bg-surface p-5 shadow-[0_12px_42px_rgba(0,0,0,0.3)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent">
          <svg
            aria-hidden="true"
            className="size-[18px]"
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
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Institution directory
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            Find an institution
          </h2>
        </div>
      </div>

      <label
        className="mb-1.5 block text-xs font-medium text-text-secondary"
        htmlFor="state-select"
      >
        Choose a state
      </label>
      {/* State names and FIPS codes come from educationData/metadata.ts. */}
      <Select
        className="app-select"
        classNamePrefix="app-select"
        inputId="state-select"
        instanceId="state-select"
        isClearable
        menuPlacement="auto"
        menuShouldScrollIntoView={false}
        onChange={(state) => onStateChange(state?.value ?? null)}
        options={stateOptions}
        placeholder="Select a state or district"
        unstyled
        value={stateOptions.find((state) => state.value === selectedStateFips) ?? null}
      />
      <p className="mt-2 text-[11px] leading-4 text-text-muted">
        Active, degree-granting four-year institutions in the selected state.
      </p>

      <div className="my-4 h-px bg-outline-subtle" />

      {/* InstitutionSearchField.tsx owns the input and results menu. App.tsx
          filters and limits the results; matchCount is the full match count. */}
      <InstitutionSearchField
        directoryStatus={directoryStatus}
        institutions={institutions}
        matchCount={matchCount}
        onInstitutionSelect={handleInstitutionSelect}
        onQueryChange={(value) => {
          onQueryChange(value)
          setDuplicateSelection(false)
        }}
        query={query}
        selectedStateFips={selectedStateFips}
        selectedUnitid={selectedUnitid}
      />

      {/* DirectoryStatus.tsx presents the request lifecycle, retry action,
          and empty-search messages. useUniversityData.ts supplies the request
          status and error; App.tsx supplies the directory and match counts. */}
      <DirectoryStatus
        error={directoryError}
        loadedInstitutionCount={loadedInstitutionCount}
        matchCount={matchCount}
        onRetry={onDirectoryRetry}
        query={query}
        reportingYear={reportingYear}
        selectedStateFips={selectedStateFips}
        status={directoryStatus}
      />

      <div className="mt-4 border-t border-outline-subtle pt-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Your selections
          </h3>
          <p className="text-xs text-text-muted">Choose up to 2 institutions</p>
        </div>
        {/* SelectionSlot.tsx renders each draft choice and its finance check.
            Slot changes remain in App.tsx until the user submits below. */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([0, 1] as const).map((slot) => (
            <SelectionSlot
              availability={financeAvailability[slot]}
              isActive={activeSlot === slot}
              key={slot}
              onActivate={(selectedSlot) => {
                setDuplicateSelection(false)
                onActiveSlotChange(selectedSlot)
              }}
              onAvailabilityRetry={onAvailabilityRetry}
              onClear={(selectedSlot) => {
                setDuplicateSelection(false)
                onClearSlot(selectedSlot)
              }}
              onYearChange={(selectedSlot, year) => {
                // App.tsx rejects a year that duplicates the other slot.
                const accepted = onSlotYearChange(selectedSlot, year)
                setDuplicateSelection(!accepted)
              }}
              selection={selectedInstitutions[slot]}
              slot={slot}
            />
          ))}
        </div>

        {duplicateSelection && (
          <p
            className="mt-3 rounded-lg border border-outline-subtle bg-surface-inset px-3 py-2 text-xs text-text-secondary"
            role="status"
          >
            This institution and reporting year are already in the other
            selection.
          </p>
        )}

        <p className="mt-2.5 text-[11px] leading-4 text-text-muted">
          Choose a slot, search for a school, then submit. Your current profile
          stays unchanged until then.
        </p>

        <button
          className="mt-3 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedCount === 0 || !allSelectionsAvailable}
          onClick={onSubmitSelection}
          type="button"
        >
          {selectedCount === 2 ? 'Compare profiles' : 'Load profile'}
        </button>

        {selectedCount === 2 && (
          <p className="mt-1.5 text-center text-[11px] text-text-muted" role="status">
            {allSelectionsAvailable
              ? 'Both selections have available data. Submit to compare them.'
              : 'Both selections need available data before comparison.'}
          </p>
        )}
        {selectedCount === 1 && displayedInstitutionName && (
          <p className="mt-1.5 text-center text-[11px] text-text-muted" role="status">
            Displaying {displayedInstitutionName} ({displayedReportingYear});
            submit to update the profile.
          </p>
        )}
      </div>
    </section>
  )
}
