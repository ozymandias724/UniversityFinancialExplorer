import {
  API_ORIGIN,
  API_TIMEOUT_MS,
  MAX_FINANCE_RESPONSE_BYTES,
} from './metadata'

interface ApiRequestOptions {
  signal?: AbortSignal
  maximumBytes?: number
  expectedPath: string
}

interface ApiJsonResponse {
  data: unknown
  bytesRead: number
}

export async function fetchApiJson(
  url: URL,
  { signal, maximumBytes = MAX_FINANCE_RESPONSE_BYTES, expectedPath }: ApiRequestOptions,
): Promise<ApiJsonResponse> {
  // Validate both origin and endpoint because pagination links come from the API response.
  if (
    url.origin !== API_ORIGIN ||
    url.protocol !== 'https:' ||
    url.pathname !== expectedPath
  ) {
    throw new Error('Blocked an unexpected Education Data API URL.')
  }

  const timeoutSignal = AbortSignal.timeout(API_TIMEOUT_MS)
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: requestSignal,
    })
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    if (timeoutSignal.aborted) {
      throw new Error('The Education Data API request timed out. Please try again.', {
        cause: error,
      })
    }
    throw new Error('Could not connect to the Education Data API.', { cause: error })
  }

  if (!response.ok) {
    throw new Error(`The Education Data API returned HTTP ${response.status}.`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength && Number(contentLength) > maximumBytes) {
    throw new Error(
      `The API response is larger than the ${formatBytes(maximumBytes)} safety limit. Try a narrower query.`,
    )
  }
  if (!response.body) {
    throw new Error('The Education Data API returned an unreadable response.')
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  // Content-Length is not always present or trustworthy, so enforce the limit while streaming too.
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      size += value.byteLength
      if (size > maximumBytes) {
        await reader.cancel()
        throw new Error(
          `The API response exceeded the ${formatBytes(maximumBytes)} safety limit. Try a narrower query.`,
        )
      }
      chunks.push(value)
    }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    if (timeoutSignal.aborted) {
      throw new Error('The Education Data API request timed out. Please try again.', {
        cause: error,
      })
    }
    throw error
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return { data, bytesRead: size }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('The Education Data API returned invalid JSON.', { cause: error })
    }
    throw error
  }
}

export function resolveApiNextUrl(
  next: string,
  expectedPath: string,
  currentUrl: URL,
  expectedQuery: ReadonlyArray<readonly [string, string]>,
): URL {
  const nextUrl = new URL(next, currentUrl)
  if (
    nextUrl.origin !== API_ORIGIN ||
    nextUrl.protocol !== 'https:' ||
    nextUrl.pathname !== expectedPath
  ) {
    throw new Error('The Education Data API returned an unexpected pagination URL.')
  }
  // A pagination link must not silently drop or broaden the filters from the initial request.
  for (const [key, value] of expectedQuery) {
    const values = nextUrl.searchParams.getAll(key)
    if (values.length !== 1 || values[0] !== value) {
      throw new Error('The Education Data API returned a pagination URL with altered filters.')
    }
  }
  return nextUrl
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}
