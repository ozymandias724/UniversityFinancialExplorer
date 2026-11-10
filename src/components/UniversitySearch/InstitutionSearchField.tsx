import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import Select, { components } from 'react-select'
import type { MenuProps, StylesConfig } from 'react-select'
import type { Institution, RequestStatus } from '../../types/education'

// Results are filtered and capped by App.tsx; matchCount includes matches
// beyond that cap. The selection callback returns false for a rejected choice.
interface InstitutionSearchFieldProps {
  selectedStateFips: number | null
  directoryStatus: RequestStatus
  query: string
  onQueryChange: (query: string) => void
  institutions: Institution[]
  matchCount: number
  selectedUnitid: number | null
  onInstitutionSelect: (institution: Institution) => boolean
}

const MatchCountContext = createContext({ visible: 0, total: 0 })

// Keep the total visible above the listbox, even as the options scroll.
function InstitutionMenu(props: MenuProps<Institution, false>) {
  const { visible, total } = useContext(MatchCountContext)
  return (
    <components.Menu {...props}>
      <p className="app-select__match-count">
        {total > visible
          ? `Showing ${visible} of ${total} matches`
          : `${total} ${total === 1 ? 'match' : 'matches'}`}
      </p>
      {props.children}
    </components.Menu>
  )
}

const searchComponents = { Menu: InstitutionMenu, DropdownIndicator: null }
const searchStyles: StylesConfig<Institution, false> = {
  // Reserve space for the match count within the menu's height limit.
  menuList: (base, props) => ({
    ...base,
    maxHeight: Math.max(0, props.maxHeight - 40),
  }),
}

export function InstitutionSearchField({
  selectedStateFips,
  directoryStatus,
  query,
  onQueryChange,
  institutions,
  matchCount,
  selectedUnitid,
  onInstitutionSelect,
}: InstitutionSearchFieldProps) {
  const [resultsOpen, setResultsOpen] = useState(false)
  const [resultsPlacement, setResultsPlacement] = useState<'top' | 'bottom'>(
    'bottom',
  )
  const [resultsMaxHeight, setResultsMaxHeight] = useState(288)
  const searchFieldRef = useRef<HTMLDivElement>(null)
  const showResults =
    resultsOpen &&
    directoryStatus === 'ready' &&
    query.trim().length > 0 &&
    matchCount > 0

  // Measure before paint and on viewport changes, preserving the roomier-side
  // placement used by the original results menu.
  useLayoutEffect(() => {
    if (!showResults) return

    const updatePlacement = () => {
      const field = searchFieldRef.current
      if (!field) return
      const bounds = field.getBoundingClientRect()
      const spaceBelow = Math.max(0, window.innerHeight - bounds.bottom - 16)
      const spaceAbove = Math.max(0, bounds.top - 16)
      const placement =
        spaceBelow >= 288 || spaceBelow >= spaceAbove ? 'bottom' : 'top'
      setResultsPlacement(placement)
      setResultsMaxHeight(
        Math.min(288, placement === 'bottom' ? spaceBelow : spaceAbove),
      )
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
    <>
      <label
        className="mb-1.5 block text-xs font-medium text-text-secondary"
        htmlFor="institution-search"
      >
        Search by name or city
      </label>
      {/* App.tsx owns filtering, including city matching and UMass aliases.
          Disable react-select's own filter so it cannot hide those results. */}
      <div ref={searchFieldRef}>
        <MatchCountContext.Provider
          value={{ visible: institutions.length, total: matchCount }}
        >
          <Select<Institution, false>
            blurInputOnSelect={false}
            className="app-select app-select--search"
            classNamePrefix="app-select"
            closeMenuOnSelect={false}
            components={searchComponents}
            filterOption={null}
            formatOptionLabel={(institution) => (
              <span className="block min-w-0">
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
            )}
            getOptionLabel={(institution) => institution.name}
            getOptionValue={(institution) => String(institution.unitid)}
            inputId="institution-search"
            inputValue={query}
            instanceId="institution-search"
            isDisabled={selectedStateFips === null || directoryStatus !== 'ready'}
            isOptionSelected={(institution) => institution.unitid === selectedUnitid}
            maxMenuHeight={resultsMaxHeight}
            minMenuHeight={0}
            menuIsOpen={showResults}
            menuPlacement={resultsPlacement}
            menuShouldScrollIntoView={false}
            onChange={(institution) => {
              // A rejected duplicate keeps the query and results available.
              if (institution && onInstitutionSelect(institution)) {
                onQueryChange('')
                setResultsOpen(false)
              }
            }}
            onInputChange={(value, action) => {
              if (action.action === 'input-change') {
                onQueryChange(value)
                setResultsOpen(true)
              }
            }}
            onMenuClose={() => setResultsOpen(false)}
            onMenuOpen={() => setResultsOpen(true)}
            openMenuOnFocus
            options={institutions}
            placeholder={
              selectedStateFips === null
                ? 'Choose a state first'
                : 'Try “Harvard” or “Amherst”'
            }
            styles={searchStyles}
            unstyled
            value={null}
          />
        </MatchCountContext.Provider>
      </div>
    </>
  )
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
