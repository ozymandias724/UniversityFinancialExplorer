# University Financial Explorer

A client-side React application for exploring colleges' reported finances from
IPEDS through the [Urban Institute Education Data API](https://educationdata.urban.org/).
The app has no custom backend or database.

## What the app does

- Select a reporting year (2014–2023; defaults to 2023) and a state.
- Search that state's active, degree-granting, four-year institutions by name
  or city. Search happens locally because the directory API does not support a
  name filter.
- Choose an institution to see reported financial figures, selected revenue
  and expense categories, and a revenue-coverage donut.
- Browse up to eight matching institutions in a scrollable menu. The menu is
  capped at 18rem high and opens above the search field when the viewport has
  insufficient room below it.
- Use the interface's dark neutral palette (`#111111` background,
  `#F2F0EB` primary text), with green accents and red deficit indicators.

The donut compares expenses with revenue; it is not a health score or reported
net income. If reported expenses exceed revenue, the inner ring fills and a red
outer arc shows the overrun. Missing API values remain unavailable rather than
being treated as zero.

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

The data flow is **state directory → local search → UNITID finance request →
financial profile**. API parsing and request limits live in the service layer;
components receive normalized, typed data.

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
- Urban Institute Education Data API (IPEDS)

Historical comparisons, university-system aggregation, user accounts, and a
custom backend are outside the current scope.
