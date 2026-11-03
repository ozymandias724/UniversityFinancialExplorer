# University Financial Explorer

A web application for exploring and understanding the financial profiles of colleges and universities in the United States.

The goal is to make institutional financial data more accessible to the general public through a clear dashboard, approachable visualizations, and useful financial context.

Rather than exposing users to raw government datasets, the application translates institutional financial reporting into information that is easier to explore and understand.

## Project Scope

The initial release will focus on a straightforward experience:

1. Find a college or university by name.
2. Select an institution.
3. Explore its financial profile for a single reporting year.

The initial version will focus on individual IPEDS reporting institutions. Historical comparisons, multi-year trends, and university-system aggregation are outside the initial scope.

The application should be designed so these capabilities can be added later without requiring a major architectural overhaul.

## Data Source

**Primary source:** [Urban Institute Education Data API](https://educationdata.urban.org/)

The application uses data from the Integrated Postsecondary Education Data System (IPEDS), accessed through the Urban Institute's API.

Two API endpoints form the foundation of the application:

### Institution Directory

```http
GET /api/v1/college-university/ipeds/directory/{year}/
```

Provides institution information, including:

- UNITID
- Institution name
- City and state
- Institution control (public, private nonprofit, private for-profit)
- Institution level
- Degree-granting status
- Active status
- University system information, where available

The directory supplies the information needed to build the institution search experience.

### Institutional Finance

```http
GET /api/v1/college-university/ipeds/finance/{year}/?unitid={unitid}
```

Returns the financial reporting record for a selected institution.

The UNITID from the directory is used internally to retrieve the corresponding financial data.

No API authentication is required for the requests tested so far.

## API Exploration and Validation

Initial API exploration was conducted in Postman before application development.

The following behavior has been confirmed:

| Test | Result |
|---|---|
| Harvard University finance record, 2023 | Successfully returned one record |
| UMass Amherst finance record, 2023 | Successfully returned one record |
| Massachusetts directory filtered by FIPS | Returned 147 institutions |
| Additional active and degree-granting filters | Reduced results to 106 |
| Four-year institution filter | Reduced results to 88 |

The directory tests used:

```http
GET /api/v1/college-university/ipeds/directory/2023/?fips=25&degree_granting=1&currently_active_ipeds=1&institution_level=4
```

`fips=25` represents Massachusetts.

The finance tests used:

```http
GET /api/v1/college-university/ipeds/finance/2023/?unitid=166027
```

Harvard University UNITID: `166027`

```http
GET /api/v1/college-university/ipeds/finance/2023/?unitid=166629
```

UMass Amherst UNITID: `166629`

Both finance requests returned a single record with the expected financial data structure.

These tests establish a working directory-to-finance lookup process. They do not establish that every institution in the directory has a finance record for every reporting year.

### Institution Search Considerations

The directory endpoint supports several useful filters, but `inst_name` is not a supported server-side filter.

The application should therefore retrieve an appropriate institution directory and perform name searching locally.

The search experience should:

- Accept familiar institution names rather than requiring UNITIDs.
- Display institution name, city, state, and institution type.
- Use UNITID internally when retrieving financial records.
- Allow users to distinguish similarly named institutions.

The Massachusetts tests also confirmed that combining active, degree-granting, and four-year institution filters produces a manageable directory.

The application is not limited to Massachusetts. The national directory retrieval strategy and any state-based filtering should be handled in the data service rather than hardcoded into the interface.

### Institution Identity

IPEDS reporting institutions should be treated as the primary unit of selection.

This distinction matters because a university's academic schools and campuses do not necessarily correspond to separate financial reporting institutions.

For example:

- Harvard College, Harvard Business School, and Harvard Law School generally belong to the same institutional financial profile.
- UMass Amherst, UMass Boston, UMass Dartmouth, and UMass Lowell are independently selectable institutions.

University-system aggregation is not part of the initial release.

## Reporting Year

The initial application will display one reporting year at a time.

There will be no historical trend charts or year comparison controls in the first release.

The reporting year should be centrally configurable rather than scattered throughout the application.

2023 is the reporting year used in the initial successful API tests. The latest available reporting year should be confirmed before choosing the production default.

## Financial Dashboard

The dashboard should organize the available data around the questions someone might naturally ask about an institution's finances.

It should not simply expose every field returned by the API.

### 1. Financial Overview

A high-level summary of the institution's financial position.

Potential metrics:

- Total revenue and additions
- Total expenses and deductions
- Net income
- Total assets
- Total liabilities
- Net assets

These should be presented as clear summary figures, with appropriate formatting and explanatory labels.

### 2. Revenue Breakdown

Explore the sources of institutional revenue.

Potential categories include:

- Tuition and fees
- Government appropriations
- Gifts, grants, and contracts
- Investment returns
- Auxiliary enterprises
- Other operating and non-operating revenue

Where applicable, distinguish gross tuition from net tuition after allowances.

### 3. Expense Breakdown

Explore how an institution spends its resources.

Potential categories include:

- Instruction
- Research
- Public service
- Academic support
- Institutional support
- Student services
- Auxiliary enterprises

Use the API's reported categories and avoid combining overlapping totals.

### 4. Additional Financial Context

Display useful supplementary information where available:

- Endowment value
- Beginning and ending endowment
- Estimated full-time equivalent enrollment
- Per-student financial figures derived from reported totals

Derived metrics should be clearly identified as calculations rather than figures directly reported by IPEDS.

## Data Interpretation

IPEDS financial reporting contains accounting distinctions and overlapping categories that must be respected.

The application should avoid presenting misleading totals or visualizations.

Important considerations:

- **Null is not zero.** Missing or unavailable values should not automatically be treated as zero.
- **Avoid double counting.** Some API fields represent subtotals or aggregates that overlap with other categories.
- **Investment returns require context.** Reported investment returns can include valuation changes and should not automatically be interpreted as recurring operating revenue.
- **Gross and net tuition differ.** Tuition allowances affect the amount ultimately reported as net tuition.
- **Income calculations may differ.** Reported net income may not equal total revenue minus total expenses because of other accounting adjustments.
- **Debt data may be incomplete.** A null long-term debt field does not establish that an institution has no debt.
- **Institutional reporting varies.** Comparisons should account for differences in accounting and reporting practices.

The dashboard should favor clear, defensible metrics over displaying every available field.

## Technology Stack

- **React** — UI development
- **Vite** — Development server and build tooling
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Recharts** — Planned for the dashboard visualization milestone
- **Urban Institute Education Data API** — Institutional and financial data

The initial application will be client-side only, with no custom backend or database.

## Current Implementation

The initial app lets a user choose a state, search that state's active,
degree-granting, four-year institutions locally, and select an institution to
request its finance record. It shows a small set of reported financial figures;
charts and the full dashboard remain deferred.

The directory request always includes `fips`, `degree_granting=1`,
`currently_active_ipeds=1`, and `institution_level=4`. The directory endpoint
returned all 88 Massachusetts matches during validation, even when sent
`page_size=1` or `per_page=1`, so those parameters are not treated as a safety
boundary. Instead, the client streams responses with a 1 MiB maximum, rejects
directories over 200 records, and stops after five pages. Finance requests are
restricted to one UNITID and capped at 256 KiB. Requests time out after 20
seconds; successful directories and finance records are cached for the current
browser session. If a limit is reached, the app displays an error instead of
continuing with a broad query.

The reporting year is configured in
[`src/services/educationData/metadata.ts`](./src/services/educationData/metadata.ts)
and currently defaults to 2023 for the validated Harvard and UMass Amherst
requests.

### Run Locally

```sh
npm install
npm run dev
```

The Vite development server prints the local URL. Use `npm run build` to
type-check and create a production build, or `npm run lint` to run Oxlint.

## Initial Architecture

Keep API communication separate from UI components.

Suggested structure:

```text
src/
├── components/
│   ├── UniversitySearch.tsx
│   ├── FinancialOverview.tsx
│   ├── RevenueChart.tsx
│   ├── ExpenseChart.tsx
│   └── AdditionalFinancialInfo.tsx
├── services/
│   └── educationData/
│       ├── client.ts
│       ├── metadata.ts
│       ├── universities.ts
│       └── finance.ts
├── hooks/
│   └── useUniversityData.ts
├── types/
│   └── education.ts
├── pages/
│   └── Dashboard.tsx
├── App.tsx
└── main.tsx
```

### Service Responsibilities

| File | Responsibility |
|---|---|
| `client.ts` | Shared API request handling, URL construction, and error handling |
| `metadata.ts` | API configuration, reporting year, and shared constants |
| `universities.ts` | Retrieve and filter the institution directory |
| `finance.ts` | Retrieve financial records for selected institutions |
| `education.ts` | TypeScript definitions for API responses and application data |

Components should consume structured application data rather than make API requests directly.

The service layer should also account for API pagination and missing records.

## User Experience

The institution search is the primary entry point.

The user should be able to search for a familiar college or university name and select the correct institution without knowing anything about IPEDS or UNITIDs.

Once selected, the dashboard should provide an immediately understandable overview of the institution's financial profile.

Prioritize:

- Clear financial summaries
- Readable charts and labels
- Consistent currency formatting
- Helpful explanations of financial terminology
- Loading and error states
- Responsive layouts
- Clear handling of unavailable data

The interface should feel like a financial exploration tool, not a government data browser.

## Initial Development Milestones

### 1. Project Setup
- Initialize Vite and React with TypeScript.
- Configure Tailwind CSS.
- Establish the initial project structure.

### 2. API Integration
- Implement the shared API client.
- Define TypeScript interfaces for directory and finance responses.
- Implement institution directory retrieval.
- Implement financial record retrieval.
- Verify the requests against the previously tested Harvard and UMass Amherst records.
- Keep requests state-scoped and enforce response-size and record-count limits.

### 3. Institution Search
- Load the institution directory.
- Implement local name searching.
- Display institution details in search results.
- Resolve selections to UNITIDs.
- Retrieve the selected institution's financial record.

### 4. Dashboard
- Normalize the financial data into a predictable application structure.
- Build the financial overview.
- Add revenue and expense visualizations.
- Add supplementary financial information.
- Handle missing and overlapping data appropriately.

### 5. Refinement
- Improve visual design and responsive behavior.
- Add explanatory context and formatting.
- Test with several different institutions.
- Review financial calculations and data presentation.

## Out of Scope for the Initial Release

To keep the first version manageable, the following are intentionally deferred:

- Historical financial trends
- Multi-year comparisons
- University-system aggregation
- User accounts and saved institutions
- Custom backend or database
- Advanced filtering and institution rankings
- Downloadable financial reports

These may be considered for future versions.

---

## Development Guidance

Build the initial application around a simple, reliable flow:

**Institution Directory → Institution Selection → Financial Record → Dashboard**

Prioritize a working data integration and a clean, understandable user experience over premature complexity.

Keep the architecture modular enough to support additional reporting years, financial metrics, and comparison features in the future.