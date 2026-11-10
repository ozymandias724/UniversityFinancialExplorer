import { useEffect, useState } from 'react'
import type {
  FinanceAvailability,
  FinanceRecord,
  Institution,
  InstitutionSelection,
  RequestStatus,
} from '../types/education'
import { getFinanceRecord } from '../services/educationData/finance'
import {
  DEFAULT_REPORTING_YEAR,
  isSupportedReportingYear,
} from '../services/educationData/metadata'
import { getInstitutions } from '../services/educationData/universities'

interface UniversityData {
  reportingYear: number
  financeReportingYear: number
  selectedStateFips: number | null
  institutions: Institution[]
  directoryStatus: RequestStatus
  directoryError: string | null
  selectedInstitution: Institution | null
  financeRecord: FinanceRecord | null
  financeStatus: RequestStatus
  financeError: string | null
  financeAvailability: [FinanceAvailability, FinanceAvailability]
  selectState: (fips: number | null) => void
  selectReportingYear: (year: number) => void
  selectInstitution: (institution: Institution, reportingYear: number) => void
  retryDirectory: () => void
  retryFinance: () => void
  retryAvailability: (slot: 0 | 1) => void
}

export function useUniversityData(
  selections: [InstitutionSelection, InstitutionSelection],
): UniversityData {
  const [reportingYear, setReportingYear] = useState(DEFAULT_REPORTING_YEAR)
  const [selectedStateFips, setSelectedStateFips] = useState<number | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [directoryStatus, setDirectoryStatus] = useState<RequestStatus>('idle')
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const [financeReportingYear, setFinanceReportingYear] = useState(
    DEFAULT_REPORTING_YEAR,
  )
  const [financeRecord, setFinanceRecord] = useState<FinanceRecord | null>(null)
  const [financeStatus, setFinanceStatus] = useState<RequestStatus>('idle')
  const [financeError, setFinanceError] = useState<string | null>(null)
  const [directoryAttempt, setDirectoryAttempt] = useState(0)
  const [financeAttempt, setFinanceAttempt] = useState(0)
  const [availabilityAttempts, setAvailabilityAttempts] = useState<
    [number, number]
  >([0, 0])

  // Independent slot checks avoid restarting one request when the other choice changes.
  const firstAvailability = useFinanceAvailability(
    selections[0].institution?.unitid ?? null,
    selections[0].reportingYear,
    availabilityAttempts[0],
  )
  const secondAvailability = useFinanceAvailability(
    selections[1].institution?.unitid ?? null,
    selections[1].reportingYear,
    availabilityAttempts[1],
  )
  const financeAvailability: [FinanceAvailability, FinanceAvailability] = [
    firstAvailability,
    secondAvailability,
  ]

  useEffect(() => {
    if (selectedStateFips === null) {
      setInstitutions([])
      setDirectoryStatus('idle')
      setDirectoryError(null)
      return
    }

    const controller = new AbortController()
    // Cancel stale state requests when the user changes states or leaves the page.
    setInstitutions([])
    setDirectoryStatus('loading')
    setDirectoryError(null)

    getInstitutions(selectedStateFips, reportingYear, controller.signal)
      .then((result) => {
        setInstitutions(result)
        setDirectoryStatus('ready')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setDirectoryError(errorMessage(error))
        setDirectoryStatus('error')
      })

    return () => controller.abort()
  }, [directoryAttempt, reportingYear, selectedStateFips])

  useEffect(() => {
    if (selectedInstitution === null) {
      setFinanceRecord(null)
      setFinanceStatus('idle')
      setFinanceError(null)
      return
    }

    const controller = new AbortController()
    // Prevent a slower prior selection from replacing the currently selected institution's data.
    setFinanceRecord(null)
    setFinanceStatus('loading')
    setFinanceError(null)

    getFinanceRecord(
      selectedInstitution.unitid,
      financeReportingYear,
      controller.signal,
    )
      .then((result) => {
        setFinanceRecord(result)
        setFinanceStatus('ready')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setFinanceError(errorMessage(error))
        setFinanceStatus('error')
      })

    return () => controller.abort()
  }, [financeAttempt, financeReportingYear, selectedInstitution])

  function selectState(fips: number | null): void {
    setSelectedStateFips(fips)
  }

  function selectReportingYear(year: number): void {
    if (!isSupportedReportingYear(year)) {
      throw new Error('Choose a supported reporting year.')
    }
    setReportingYear(year)
  }

  function selectInstitution(institution: Institution, year: number): void {
    if (!isSupportedReportingYear(year)) {
      throw new Error('Choose a supported reporting year.')
    }
    setSelectedInstitution(institution)
    setFinanceReportingYear(year)
  }

  function retryDirectory(): void {
    setDirectoryAttempt((attempt) => attempt + 1)
  }

  function retryFinance(): void {
    setFinanceAttempt((attempt) => attempt + 1)
  }

  function retryAvailability(slot: 0 | 1): void {
    setAvailabilityAttempts((attempts) => {
      const next: [number, number] = [...attempts]
      next[slot] += 1
      return next
    })
  }

  return {
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
  }
}

function emptyAvailability(reportingYear: number): FinanceAvailability {
  return {
    unitid: null,
    reportingYear,
    status: 'idle',
    hasRecord: null,
    error: null,
    record: null,
  }
}

function useFinanceAvailability(
  unitid: number | null,
  reportingYear: number,
  attempt: number,
): FinanceAvailability {
  const [availability, setAvailability] = useState<FinanceAvailability>(() =>
    emptyAvailability(reportingYear),
  )

  useEffect(() => {
    if (unitid === null) {
      setAvailability(emptyAvailability(reportingYear))
      return
    }

    const controller = new AbortController()
    setAvailability({
      unitid,
      reportingYear,
      status: 'loading',
      hasRecord: null,
      error: null,
      record: null,
    })

    // This service also powers profile loading, so a successful check is reusable on submission.
    getFinanceRecord(unitid, reportingYear, controller.signal)
      .then((record) => {
        if (!controller.signal.aborted) {
          setAvailability({
            unitid,
            reportingYear,
            status: 'ready',
            hasRecord: record !== null,
            error: null,
            record,
          })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAvailability({
            unitid,
            reportingYear,
            status: 'error',
            hasRecord: null,
            error: errorMessage(error),
            record: null,
          })
        }
      })

    return () => controller.abort()
  }, [attempt, reportingYear, unitid])

  return availability
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
