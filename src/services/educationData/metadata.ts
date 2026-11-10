export const API_ORIGIN = "https://educationdata.urban.org";
// Offer the ten latest years with finance records confirmed for the Harvard and UMass test cases.
export const REPORTING_YEARS = [
  2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014,
] as const;
export const DEFAULT_REPORTING_YEAR = 2023;

// These hard limits prevent slow or oversized directory/finance responses from reaching the UI.
// The directory API may return a whole state's records in one response; these are client-side hard stops.
export const MAX_DIRECTORY_RECORDS = 200;
export const MAX_DIRECTORY_PAGES = 5;
export const MAX_DIRECTORY_RESPONSE_BYTES = 1024 * 1024;
// Finance queries are scoped to one UNITID, so their response budget can stay much smaller.
export const MAX_FINANCE_RESPONSE_BYTES = 256 * 1024;
export const API_TIMEOUT_MS = 20_000;
// Keep the full state directory for searching, but avoid rendering an unbounded result list.
export const SEARCH_RESULT_LIMIT = 8;

// Shared state metadata also provides the FIPS values required by the API.
export interface StateOption {
  name: string;
  abbreviation: string;
  fips: number;
}

// FIPS codes are the values expected by the API's directory filter.
export const US_STATES = [
  { name: "Alabama", abbreviation: "AL", fips: 1 },
  { name: "Alaska", abbreviation: "AK", fips: 2 },
  { name: "Arizona", abbreviation: "AZ", fips: 4 },
  { name: "Arkansas", abbreviation: "AR", fips: 5 },
  { name: "California", abbreviation: "CA", fips: 6 },
  { name: "Colorado", abbreviation: "CO", fips: 8 },
  { name: "Connecticut", abbreviation: "CT", fips: 9 },
  { name: "Delaware", abbreviation: "DE", fips: 10 },
  { name: "District of Columbia", abbreviation: "DC", fips: 11 },
  { name: "Florida", abbreviation: "FL", fips: 12 },
  { name: "Georgia", abbreviation: "GA", fips: 13 },
  { name: "Hawaii", abbreviation: "HI", fips: 15 },
  { name: "Idaho", abbreviation: "ID", fips: 16 },
  { name: "Illinois", abbreviation: "IL", fips: 17 },
  { name: "Indiana", abbreviation: "IN", fips: 18 },
  { name: "Iowa", abbreviation: "IA", fips: 19 },
  { name: "Kansas", abbreviation: "KS", fips: 20 },
  { name: "Kentucky", abbreviation: "KY", fips: 21 },
  { name: "Louisiana", abbreviation: "LA", fips: 22 },
  { name: "Maine", abbreviation: "ME", fips: 23 },
  { name: "Maryland", abbreviation: "MD", fips: 24 },
  { name: "Massachusetts", abbreviation: "MA", fips: 25 },
  { name: "Michigan", abbreviation: "MI", fips: 26 },
  { name: "Minnesota", abbreviation: "MN", fips: 27 },
  { name: "Mississippi", abbreviation: "MS", fips: 28 },
  { name: "Missouri", abbreviation: "MO", fips: 29 },
  { name: "Montana", abbreviation: "MT", fips: 30 },
  { name: "Nebraska", abbreviation: "NE", fips: 31 },
  { name: "Nevada", abbreviation: "NV", fips: 32 },
  { name: "New Hampshire", abbreviation: "NH", fips: 33 },
  { name: "New Jersey", abbreviation: "NJ", fips: 34 },
  { name: "New Mexico", abbreviation: "NM", fips: 35 },
  { name: "New York", abbreviation: "NY", fips: 36 },
  { name: "North Carolina", abbreviation: "NC", fips: 37 },
  { name: "North Dakota", abbreviation: "ND", fips: 38 },
  { name: "Ohio", abbreviation: "OH", fips: 39 },
  { name: "Oklahoma", abbreviation: "OK", fips: 40 },
  { name: "Oregon", abbreviation: "OR", fips: 41 },
  { name: "Pennsylvania", abbreviation: "PA", fips: 42 },
  { name: "Rhode Island", abbreviation: "RI", fips: 44 },
  { name: "South Carolina", abbreviation: "SC", fips: 45 },
  { name: "South Dakota", abbreviation: "SD", fips: 46 },
  { name: "Tennessee", abbreviation: "TN", fips: 47 },
  { name: "Texas", abbreviation: "TX", fips: 48 },
  { name: "Utah", abbreviation: "UT", fips: 49 },
  { name: "Vermont", abbreviation: "VT", fips: 50 },
  { name: "Virginia", abbreviation: "VA", fips: 51 },
  { name: "Washington", abbreviation: "WA", fips: 53 },
  { name: "West Virginia", abbreviation: "WV", fips: 54 },
  { name: "Wisconsin", abbreviation: "WI", fips: 55 },
  { name: "Wyoming", abbreviation: "WY", fips: 56 },
] as const satisfies readonly StateOption[];

export function isSupportedStateFips(value: number): boolean {
  return US_STATES.some((state) => state.fips === value);
}

export function isSupportedReportingYear(value: number): boolean {
  return REPORTING_YEARS.some((year) => year === value);
}
