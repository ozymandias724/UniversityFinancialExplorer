# University Financial Explorer

A client-side React application for exploring colleges' reported finances from
IPEDS through the [Urban Institute Education Data API](https://educationdata.urban.org/).
The app has no custom backend or database.

## What the app does

- Choose a reporting year and state for each of up to two institution
  selections (years default to 2023).
- The same institution can be selected in both slots for different years; an
  identical institution-and-year pair cannot be selected twice.
- Each selected institution-year is checked before submission. Missing data
  blocks submission; request errors are shown separately and can be retried.
- Search that state's active, degree-granting, four-year institutions by name
  or city. Search happens locally because the directory API does not support a
  name filter.
- Submit one selected institution to see reported financial figures, selected
  revenue and expense categories, and a revenue-coverage donut. Submit two
  selections to compare their profiles side by side on desktop, or switch
  between them with sticky, keyboard-accessible tabs on mobile.
- Browse up to eight matching institutions in a scrollable menu. The menu is
  capped at 18rem high and opens above the search field when the viewport has
  insufficient room below it.
- Search the state selector and use keyboard-accessible dropdowns for state,
  reporting year, and institution choices.
- Use the interface's dark neutral palette (`#111111` background,
  `#F2F0EB` primary text), with green accents and red deficit indicators.

The donut compares expenses with revenue; it is not a health score or reported
net income. If reported expenses exceed revenue, the inner ring fills and a red
outer arc shows the overrun. Missing API values remain unavailable rather than
being treated as zero. Financial amounts are reported in nominal dollars and
are not adjusted for inflation.

## Data requests and safeguards

The directory request is scoped to one state with `fips`, `degree_granting=1`,
`currently_active_ipeds=1`, and `institution_level=4`. The API has ignored
page-size hints during testing, so the client also enforces:

- 1 MiB total directory response size
- 200 directory records
- Five directory pages
- 20-second request timeout

Finance requests are limited to one UNITID, with a 256 KiB response limit and
the same timeout. Responses are validated before use. Directory and finance
results are cached in memory for the current browser session. If a response
exceeds a limit or fails validation, the app displays an error instead of
silently showing partial data.

Harvard (UNITID `166027`) and UMass Amherst (UNITID `166629`) were checked for
2014–2026. Both had finance records for 2014–2023 and none for 2024–2026. This
confirms a practical selector range, not year-by-year coverage for every
institution.

## Project structure

```text
src/
├── components/       # Institution search and financial visualizations
├── hooks/            # Request lifecycle and selected institution state
├── services/
│   └── educationData/ # API client, directory, finance, and shared metadata
├── types/            # Normalized API and application types
├── App.tsx
└── main.tsx
```

## How the app works

The app separates page display, request state, and API communication:

1. [`App.tsx`](./src/App.tsx) assembles the page and keeps the text typed into
   the institution search. It filters the already-loaded state directory
   locally, then passes selections and data to the UI components.
2. [`useUniversityData`](./src/hooks/useUniversityData.ts) owns the active
   search state and year, the institution and year currently shown in the
   profile, and the per-slot finance availability checks. It tracks request
   status and cancels outdated requests so stale results cannot replace newer
   ones.
3. The service functions build endpoint-specific requests:
   [`getInstitutions`](./src/services/educationData/universities.ts) loads a
   bounded state directory, and
   [`getFinanceRecord`](./src/services/educationData/finance.ts) requests one
   institution's record for one year.
4. Both services use [`client.ts`](./src/services/educationData/client.ts) for
   the shared network safeguards: checking the API URL, enforcing time and
   response-size limits, and parsing JSON. The service then validates the
   endpoint's response and returns only the fields the app needs.
5. The hook gives the validated data and request status back to `App.tsx`.
   Components display the directory, financial figures, or the appropriate
   empty, loading, and error state.

In short: **selection → request → validation → display**. Shared years, state
codes, and request limits are defined in
[`metadata.ts`](./src/services/educationData/metadata.ts); the normalized
application data shapes are in [`types/education.ts`](./src/types/education.ts).

## Development

```sh
npm install
npm run dev
```

Available checks:

```sh
npm run lint
npm run build
npm run preview
```

The production build is written to `dist/`. Vite configuration controls the
deployment base path.

## Technology

- React and TypeScript
- Vite
- Tailwind CSS
- Recharts
- react-select
- Urban Institute Education Data API (IPEDS)

Historical comparisons, university-system aggregation, user accounts, and a
custom backend are outside the current scope.
