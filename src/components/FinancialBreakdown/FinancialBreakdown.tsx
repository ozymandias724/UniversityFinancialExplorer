import type { FinanceRecord } from '../../types/education'
import { CategoryChart } from './CategoryChart'
import { expenseCategories, revenueCategories } from './financeCategories'
import { RevenueCoverageDonut } from './RevenueCoverageDonut'

interface FinancialBreakdownProps {
  record: FinanceRecord
  // Comparison profiles use a single-column chart layout.
  compact?: boolean
}

// App.tsx lazy-loads this section after a profile is submitted.
export function FinancialBreakdown({
  record,
  compact = false,
}: FinancialBreakdownProps) {
  return (
    <section className="mt-8 border-t border-outline-subtle pt-7">
      {/* RevenueCoverageDonut.tsx compares reported totals, including overruns. */}
      <RevenueCoverageDonut compact={compact} record={record} />

      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Where the money comes from and goes
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-text-primary">
          Selected reported categories
        </h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          These categories are not a complete breakdown and should not be added
          together as totals. A missing value means it was not reported.
        </p>
      </div>

      {/* CategoryChart.tsx renders the selected fields listed in financeCategories.ts;
          these are individual reported categories, not a complete total. */}
      <div className={`grid gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
        <CategoryChart
          categories={revenueCategories}
          color="#5a8963"
          record={record}
          title="Revenue"
        />
        <CategoryChart
          categories={expenseCategories}
          color="#7595ad"
          record={record}
          title="Expenses"
        />
      </div>

      <p className="mt-4 rounded-xl bg-surface-inset px-4 py-3 text-xs leading-5 text-text-muted">
        Investment returns can include valuation changes, so they may not
        represent recurring revenue. Values are shown as reported by IPEDS.
      </p>
    </section>
  )
}
