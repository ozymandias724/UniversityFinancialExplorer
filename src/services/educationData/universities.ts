import type { ApiResponse, Institution } from '../../types/education'
import { fetchApiJson, resolveApiNextUrl } from './client'
import {
  API_TIMEOUT_MS,
  API_ORIGIN,
  MAX_DIRECTORY_PAGES,
  MAX_DIRECTORY_RECORDS,
  MAX_DIRECTORY_RESPONSE_BYTES,
  isSupportedStateFips,
  isSupportedReportingYear,
} from './metadata'

// Cache only complete, validated state directories; incomplete responses must be retried.
const directoryCache = new Map<string, Institution[]>()
const REQUIRED_DIRECTORY_FILTERS = [
  ['degree_granting', '1'],
  ['currently_active_ipeds', '1'],
  ['institution_level', '4'],
] as const

export async function getInstitutions(
  stateFips: number,
  reportingYear: number,
  signal?: AbortSignal,
): Promise<Institution[]> {
  if (!isSupportedStateFips(stateFips)) {
    throw new Error('Choose a valid state before searching institutions.')
  }
  if (!isSupportedReportingYear(reportingYear)) {
    throw new Error('Choose a supported reporting year before searching institutions.')
  }
  signal?.throwIfAborted()

  const cacheKey = `${reportingYear}:${stateFips}`
  const cachedInstitutions = directoryCache.get(cacheKey)
  if (cachedInstitutions) {
    return cachedInstitutions
  }

  const directoryPath = `/api/v1/college-university/ipeds/directory/${reportingYear}/`
  const initialUrl = new URL(directoryPath, API_ORIGIN)
  initialUrl.searchParams.set('fips', String(stateFips))
  // Name search is not supported server-side, so these scope filters keep local search bounded.
  initialUrl.searchParams.set('degree_granting', '1')
  initialUrl.searchParams.set('currently_active_ipeds', '1')
  initialUrl.searchParams.set('institution_level', '4')

  const institutions: Institution[] = []
  const visitedUrls = new Set<string>()
  let nextUrl: URL | null = initialUrl
  let expectedCount: number | null = null
  let totalBytes = 0
  let pages = 0
  // Apply one deadline to the complete paginated operation, not a fresh timeout per page.
  const timeoutSignal = AbortSignal.timeout(API_TIMEOUT_MS)
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  try {
    while (nextUrl) {
      if (pages >= MAX_DIRECTORY_PAGES) {
        throw new Error(
          `This directory needs more than ${MAX_DIRECTORY_PAGES} pages. Narrow your search by choosing another state.`,
        )
      }
      if (visitedUrls.has(nextUrl.href)) {
        throw new Error('The Education Data API returned a repeated pagination link.')
      }
      visitedUrls.add(nextUrl.href)

      const remainingBytes = MAX_DIRECTORY_RESPONSE_BYTES - totalBytes
      if (remainingBytes <= 0) {
        throw new Error('The directory reached its response-size limit. Choose another state.')
      }

      const { data, bytesRead } = await fetchApiJson(nextUrl, {
        signal: requestSignal,
        maximumBytes: remainingBytes,
        expectedPath: directoryPath,
      })
      const envelope = parseApiResponse(data)
      totalBytes += bytesRead
      pages += 1

      if (expectedCount === null) {
        expectedCount = envelope.count
        // The API has ignored page-size hints in testing, so reject broad states before processing their rows.
        if (expectedCount > MAX_DIRECTORY_RECORDS) {
          throw new Error(
            `This state has ${expectedCount} matching institutions, above the ${MAX_DIRECTORY_RECORDS}-record safety limit. Choose another state.`,
          )
        }
      } else if (envelope.count !== expectedCount) {
        throw new Error('The directory count changed while pages were being retrieved.')
      }

      institutions.push(...envelope.results.map(parseInstitution))
      if (institutions.length > MAX_DIRECTORY_RECORDS) {
        throw new Error(
          `The directory exceeded the ${MAX_DIRECTORY_RECORDS}-record safety limit. Choose another state.`,
        )
      }

      nextUrl = envelope.next
        ? resolveApiNextUrl(envelope.next, directoryPath, nextUrl, [
            ['fips', String(stateFips)],
            ...REQUIRED_DIRECTORY_FILTERS,
          ])
        : null
    }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    if (timeoutSignal.aborted) {
      throw new Error(
        `The institution directory request exceeded ${API_TIMEOUT_MS / 1000} seconds. Please try again.`,
        { cause: error },
      )
    }
    throw error
  }

  if (institutions.length !== expectedCount) {
    throw new Error(
      `The API returned ${institutions.length} of ${expectedCount} directory records. Please try again.`,
    )
  }

  // Only cache after every page is received and the result count agrees with the API's advertised count.
  directoryCache.set(cacheKey, institutions)
  return institutions
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
    !Array.isArray(data.results) ||
    !('next' in data) ||
    (data.next !== null && typeof data.next !== 'string')
  ) {
    throw new Error('The Education Data API returned an unexpected directory response.')
  }

  return {
    count: data.count,
    next: data.next,
    results: data.results,
  }
}

function parseInstitution(data: unknown): Institution {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('unitid' in data) ||
    typeof data.unitid !== 'number' ||
    !Number.isInteger(data.unitid) ||
    !('inst_name' in data) ||
    typeof data.inst_name !== 'string' ||
    !data.inst_name.trim()
  ) {
    throw new Error('The directory contains an invalid institution record.')
  }

  return {
    unitid: data.unitid,
    name: data.inst_name,
    city: optionalString(data, 'city'),
    stateAbbreviation: optionalString(data, 'state_abbr'),
    control: optionalNumber(data, 'inst_control'),
  }
}

function optionalString(data: object, key: string): string | null {
  if (!(key in data)) {
    return null
  }
  const value = Reflect.get(data, key)
  if (value === null || typeof value === 'string') {
    return value
  }
  throw new Error(`The directory returned an invalid ${key} value.`)
}

function optionalNumber(data: object, key: string): number | null {
  if (!(key in data)) {
    return null
  }
  const value = Reflect.get(data, key)
  if (value === null || (typeof value === 'number' && Number.isFinite(value))) {
    return value
  }
  throw new Error(`The directory returned an invalid ${key} value.`)
}
