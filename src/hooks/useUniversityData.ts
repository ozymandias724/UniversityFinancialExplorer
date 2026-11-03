import { useEffect, useState } from 'react'
import type {
  FinanceRecord,
  Institution,
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
  selectedStateFips: number | null
  institutions: Institution[]
  directoryStatus: RequestStatus
  directoryError: string | null
  selectedInstitution: Institution | null
  financeRecord: FinanceRecord | null
  financeStatus: RequestStatus
  financeError: string | null
  selectState: (fips: number | null) => void
  selectReportingYear: (year: number) => void
  selectInstitution: (institution: Institution) => void
  retryDirectory: () => void
  retryFinance: () => void
}

export function useUniversityData(): UniversityData {
  const [reportingYear, setReportingYear] = useState(DEFAULT_REPORTING_YEAR)
  const [selectedStateFips, setSelectedStateFips] = useState<number | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [directoryStatus, setDirectoryStatus] = useState<RequestStatus>('idle')
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const [financeRecord, setFinanceRecord] = useState<FinanceRecord | null>(null)
  const [financeStatus, setFinanceStatus] = useState<RequestStatus>('idle')
  const [financeError, setFinanceError] = useState<string | null>(null)
  const [directoryAttempt, setDirectoryAttempt] = useState(0)
  const [financeAttempt, setFinanceAttempt] = useState(0)

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

    getFinanceRecord(selectedInstitution.unitid, reportingYear, controller.signal)
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
  }, [financeAttempt, reportingYear, selectedInstitution])

  function selectState(fips: number | null): void {
    setSelectedStateFips(fips)
    setSelectedInstitution(null)
  }

  function selectReportingYear(year: number): void {
    if (!isSupportedReportingYear(year)) {
      throw new Error('Choose a supported reporting year.')
    }
    setReportingYear(year)
  }

  function selectInstitution(institution: Institution): void {
    setSelectedInstitution(institution)
  }

  function retryDirectory(): void {
    setDirectoryAttempt((attempt) => attempt + 1)
  }

  function retryFinance(): void {
    setFinanceAttempt((attempt) => attempt + 1)
  }

  return {
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
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
