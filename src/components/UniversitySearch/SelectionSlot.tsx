import Select from 'react-select'
import { REPORTING_YEARS } from '../../services/educationData/metadata'
import type { FinanceAvailability, InstitutionSelection } from '../../types/education'

const yearOptions = REPORTING_YEARS.map((year) => ({
  value: year,
  label: String(year),
}))

// A slot is a draft institution/year pair. App.tsx owns edits and the active
// slot; useUniversityData.ts checks finance availability for each pair.
interface SelectionSlotProps {
  slot: 0 | 1
  selection: InstitutionSelection
  availability: FinanceAvailability
  isActive: boolean
  onYearChange: (slot: 0 | 1, year: number) => void
  onActivate: (slot: 0 | 1) => void
  onClear: (slot: 0 | 1) => void
  onAvailabilityRetry: (slot: 0 | 1) => void
}

export function SelectionSlot({
  slot,
  selection,
  availability,
  isActive,
  onYearChange,
  onActivate,
  onClear,
  onAvailabilityRetry,
}: SelectionSlotProps) {
  const institution = selection.institution
  const availabilityMatchesSelection =
    institution !== null &&
    availability.unitid === institution.unitid &&
    availability.reportingYear === selection.reportingYear
  // Never show a previous selection's availability while the new check is pending.
  const availabilityStatus = availabilityMatchesSelection
    ? availability.status
    : institution
      ? 'loading'
      : 'idle'

  return (
    <div
      className={`min-w-0 rounded-xl border p-2.5 ${
        isActive
          ? 'border-accent-outline bg-accent-surface'
          : 'border-outline-subtle bg-surface-inset'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        Institution {slot + 1}
      </p>
      <label className="sr-only" htmlFor={`slot-${slot}-year`}>
        Reporting year
      </label>
      {/* Supported reporting years are maintained in educationData/metadata.ts. */}
      <Select
        aria-label={`Institution ${slot + 1} reporting year`}
        className="app-select app-select--compact"
        classNamePrefix="app-select"
        inputId={`slot-${slot}-year`}
        instanceId={`slot-${slot}-year`}
        isSearchable={false}
        menuPlacement="auto"
        menuShouldScrollIntoView={false}
        onChange={(year) => {
          if (year) onYearChange(slot, year.value)
        }}
        options={yearOptions}
        unstyled
        value={yearOptions.find((year) => year.value === selection.reportingYear) ?? null}
      />
      <button
        aria-pressed={isActive}
        className="mt-2 w-full text-left focus:outline-none focus:ring-2 focus:ring-[#6c9274]"
        onClick={() => onActivate(slot)}
        type="button"
      >
        <span className="mt-1 block truncate text-sm font-medium text-text-primary">
          {institution?.name ??
            (slot === 0 ? 'Select an institution' : 'Add another')}
        </span>
        {institution && (
          <span className="mt-1 block truncate text-xs text-text-muted">
            {institution.city ?? 'Location unavailable'}
            {institution.stateAbbreviation
              ? `, ${institution.stateAbbreviation}`
              : ''}
          </span>
        )}
      </button>
      {institution && (
        <button
          aria-label={`Remove ${institution.name}`}
          className="mt-2 text-xs font-medium text-text-muted underline underline-offset-2 hover:text-text-primary"
          onClick={() => onClear(slot)}
          type="button"
        >
          Remove
        </button>
      )}
      {institution && (
        <div
          aria-live="polite"
          className="mt-3 border-t border-outline-subtle pt-2 text-xs leading-5 text-text-muted"
        >
          {availabilityStatus === 'loading' && (
            <p>Checking data for {selection.reportingYear}…</p>
          )}
          {availabilityStatus === 'ready' && availability.hasRecord && (
            <p className="text-accent">
              Data available for {selection.reportingYear}
            </p>
          )}
          {availabilityStatus === 'ready' && !availability.hasRecord && (
            <p className="text-error-text">
              No finance record is available for {selection.reportingYear}.
              Choose another year or institution.
            </p>
          )}
          {availabilityStatus === 'error' && (
            <>
              <p className="text-error-text">
                Could not check this institution's data: {availability.error}
              </p>
              <button
                className="mt-1 font-semibold underline underline-offset-2"
                onClick={() => onAvailabilityRetry(slot)}
                type="button"
              >
                Retry check
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
