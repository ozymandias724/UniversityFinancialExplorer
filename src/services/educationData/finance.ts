import type { ApiResponse, FinanceRecord } from '../../types/education'
import { fetchApiJson } from './client'
import {
  API_ORIGIN,
  MAX_FINANCE_RESPONSE_BYTES,
  REPORTING_YEAR,
} from './metadata'

const FINANCE_PATH = `/api/v1/college-university/ipeds/finance/${REPORTING_YEAR}/`
// Null is cached as "no record"; it is distinct from a failed request and from numeric zeroes.
const financeCache = new Map<number, FinanceRecord | null>()

export async function getFinanceRecord(
  unitid: number,
  signal?: AbortSignal,
): Promise<FinanceRecord | null> {
  if (!Number.isInteger(unitid) || unitid <= 0) {
    throw new Error('Choose a valid institution before requesting financial data.')
  }
  signal?.throwIfAborted()

  if (financeCache.has(unitid)) {
    return financeCache.get(unitid) ?? null
  }

  const url = new URL(FINANCE_PATH, API_ORIGIN)
  url.searchParams.set('unitid', String(unitid))

  const { data } = await fetchApiJson(url, {
    signal,
    maximumBytes: MAX_FINANCE_RESPONSE_BYTES,
    expectedPath: FINANCE_PATH,
  })
  const envelope = parseApiResponse(data)

  // A missing reporting record is valid API data; multiple rows for one UNITID/year are not expected.
  if (envelope.count === 0 && envelope.results.length === 0) {
    financeCache.set(unitid, null)
    return null
  }
  if (envelope.count !== 1 || envelope.results.length !== 1) {
    throw new Error(
      'The API returned an unexpected number of finance records for this institution.',
    )
  }

  const record = parseFinanceRecord(envelope.results[0])
  if (record.unitid !== unitid || record.year !== REPORTING_YEAR) {
    throw new Error('The API returned a finance record for a different institution or year.')
  }

  financeCache.set(unitid, record)
  return record
}

function parseApiResponse(data: unknown): ApiResponse<unknown> {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('count' in data) ||
    typeof data.count !== 'number' ||
    !Number.isInteger(data.count) ||
    data.count < 0 ||
    !('results' in data) ||
    !Array.isArray(data.results)
  ) {
    throw new Error('The Education Data API returned an unexpected finance response.')
  }

  return {
    count: data.count,
    next: null,
    results: data.results,
  }
}

function parseFinanceRecord(data: unknown): FinanceRecord {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('unitid' in data) ||
    typeof data.unitid !== 'number' ||
    !Number.isInteger(data.unitid) ||
    !('year' in data) ||
    typeof data.year !== 'number' ||
    !Number.isInteger(data.year)
  ) {
    throw new Error('The API returned an invalid finance record.')
  }

  return {
    unitid: data.unitid,
    year: data.year,
    total_revenues_additions: requiredNullableNumber(data, 'total_revenues_additions'),
    total_expenses_deductions: requiredNullableNumber(data, 'total_expenses_deductions'),
    income_net: requiredNullableNumber(data, 'income_net'),
    assets: requiredNullableNumber(data, 'assets'),
    liabilities: requiredNullableNumber(data, 'liabilities'),
    endowment_end: requiredNullableNumber(data, 'endowment_end'),
    est_fte: requiredNullableNumber(data, 'est_fte'),
  }
}

function requiredNullableNumber(data: object, key: string): number | null {
  if (!(key in data)) {
    throw new Error(`The finance record is missing the ${key} field.`)
  }
  const value = Reflect.get(data, key)
  if (value === null || (typeof value === 'number' && Number.isFinite(value))) {
    return value
  }
  throw new Error(`The finance record returned an invalid ${key} value.`)
}
