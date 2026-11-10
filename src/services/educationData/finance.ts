import type { ApiResponse, FinanceRecord } from '../../types/education'
import { fetchApiJson } from './client'
import {
  API_ORIGIN,
  MAX_FINANCE_RESPONSE_BYTES,
  isSupportedReportingYear,
} from './metadata'

// Null is cached as "no record"; it is distinct from a failed request and from numeric zeroes.
const financeCache = new Map<string, FinanceRecord | null>()

// Request and validate the single record identified by institution ID (UNITID) and reporting year.
export async function getFinanceRecord(
  unitid: number,
  reportingYear: number,
  signal?: AbortSignal,
): Promise<FinanceRecord | null> {
  if (!Number.isInteger(unitid) || unitid <= 0) {
    throw new Error('Choose a valid institution before requesting financial data.')
  }
  if (!isSupportedReportingYear(reportingYear)) {
    throw new Error('Choose a supported reporting year before requesting financial data.')
  }
  signal?.throwIfAborted()

  const cacheKey = `${reportingYear}:${unitid}`
  if (financeCache.has(cacheKey)) {
    return financeCache.get(cacheKey) ?? null
  }

  const financePath = `/api/v1/college-university/ipeds/finance/${reportingYear}/`
  const url = new URL(financePath, API_ORIGIN)
  // UNITID keeps the finance query limited to one institution.
  url.searchParams.set('unitid', String(unitid))

  const { data } = await fetchApiJson(url, {
    signal,
    maximumBytes: MAX_FINANCE_RESPONSE_BYTES,
    expectedPath: financePath,
  })
  const envelope = parseApiResponse(data)

  // A missing reporting record is valid API data; multiple rows for one UNITID/year are not expected.
  if (envelope.count === 0 && envelope.results.length === 0) {
    financeCache.set(cacheKey, null)
    return null
  }
  if (envelope.count !== 1 || envelope.results.length !== 1) {
    throw new Error(
      'The API returned an unexpected number of finance records for this institution.',
    )
  }

  const record = parseFinanceRecord(envelope.results[0])
  if (record.unitid !== unitid || record.year !== reportingYear) {
    throw new Error('The API returned a finance record for a different institution or year.')
  }

  financeCache.set(cacheKey, record)
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

  // Select only the fields used by the app and check each reported value before returning it.
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
    rev_tuition_fees_net: requiredNullableNumber(data, 'rev_tuition_fees_net'),
    rev_appropriations_state: requiredNullableNumber(data, 'rev_appropriations_state'),
    rev_fed_approps_grants: requiredNullableNumber(data, 'rev_fed_approps_grants'),
    rev_gifts_grants_contracts: requiredNullableNumber(data, 'rev_gifts_grants_contracts'),
    rev_auxiliary_enterprises_net: requiredNullableNumber(
      data,
      'rev_auxiliary_enterprises_net',
    ),
    rev_investment_return: requiredNullableNumber(data, 'rev_investment_return'),
    exp_instruc_total: requiredNullableNumber(data, 'exp_instruc_total'),
    exp_research_total: requiredNullableNumber(data, 'exp_research_total'),
    exp_pub_serv_total: requiredNullableNumber(data, 'exp_pub_serv_total'),
    exp_acad_supp_total: requiredNullableNumber(data, 'exp_acad_supp_total'),
    exp_student_serv_total: requiredNullableNumber(data, 'exp_student_serv_total'),
    exp_inst_supp_total: requiredNullableNumber(data, 'exp_inst_supp_total'),
    exp_aux_ent_total: requiredNullableNumber(data, 'exp_aux_ent_total'),
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
