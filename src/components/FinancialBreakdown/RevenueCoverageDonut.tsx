import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { FinanceRecord } from '../../types/education'
import { currencyFormatter, percentageFormatter } from './formatters'

interface RevenueCoverageDonutProps {
  record: FinanceRecord
  compact?: boolean
}

// Compare reported expenses with revenue; the chart does not calculate net income.
export function RevenueCoverageDonut({
  record,
  compact = false,
}: RevenueCoverageDonutProps) {
  const revenue = record.total_revenues_additions

  if (
    revenue === null ||
    record.total_expenses_deductions === null ||
    revenue <= 0 ||
    record.total_expenses_deductions < 0
  ) {
    return (
      <section className="mb-8 rounded-2xl border border-outline bg-surface-inset p-5">
        <h3 className="text-base font-semibold text-text-primary">
          Revenue coverage
        </h3>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          A coverage chart is unavailable because reported revenue or expenses
          are missing, or the values do not support a meaningful ratio.
        </p>
      </section>
    )
  }

  const expenses = record.total_expenses_deductions
  const expenseShare = expenses / revenue
  // Split expenses at the revenue total so the inner ring fills when expenses exceed revenue.
  const revenueAboveExpenses = Math.max(revenue - expenses, 0)
  const expenseWithinRevenue = Math.min(expenses, revenue)
  const exceededRevenue = expenses > revenue
  // The outer ring shows excess expenses up to 100% of revenue; the center label keeps the full ratio.
  const overrunShare = Math.min((expenses - revenue) / revenue, 1)
  const chartData = [
    { name: 'Expenses within revenue', value: expenseWithinRevenue },
    { name: 'Revenue above expenses', value: revenueAboveExpenses },
  ]

  return (
    <section
      aria-label={`Revenue coverage for ${record.year}`}
      className="mb-8 rounded-2xl border border-accent-outline bg-accent-surface p-5 sm:p-6"
    >
      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Overall financial snapshot
        </p>
        <h3 className="text-base font-semibold text-text-primary">
          Revenue coverage
        </h3>
      </div>
      <div
        className={`grid items-center gap-4 ${
          compact ? '' : 'md:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)]'
        }`}
      >
        <div className="relative mx-auto h-[220px] w-full max-w-[260px]">
          <div
            aria-label={`Expenses are ${percentageFormatter.format(expenseShare * 100)} percent of reported revenue.${exceededRevenue ? ` The red outer ring shows expenses exceeding revenue by ${percentageFormatter.format((expenses - revenue) / revenue * 100)} percent of revenue.` : ''}`}
            className="absolute inset-0"
            role="img"
          >
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                {exceededRevenue && (
                  <Pie
                    data={[
                      { name: 'Expenses above revenue', value: overrunShare },
                      { name: 'Remaining overrun scale', value: 1 - overrunShare },
                    ]}
                    dataKey="value"
                    endAngle={-270}
                    innerRadius="91%"
                    nameKey="name"
                    outerRadius="99%"
                    startAngle={90}
                    stroke="none"
                    tooltipType="none"
                  >
                    <Cell fill="#c94d3b" />
                    <Cell fill="transparent" />
                  </Pie>
                )}
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius="68%"
                  nameKey="name"
                  outerRadius="90%"
                  paddingAngle={1}
                  stroke="none"
                >
                  <Cell fill="#5a8963" />
                  <Cell fill="#344638" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#191919',
                    border: '1px solid #343430',
                    borderRadius: '12px',
                    color: '#f2f0eb',
                    fontSize: '12px',
                  }}
                  formatter={(value) =>
                    currencyFormatter.format(Number(value ?? 0))
                  }
                  wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center"
          >
            <span className="text-2xl font-semibold tracking-tight text-text-primary">
              {percentageFormatter.format(expenseShare * 100)}%
            </span>
            <span className="mt-1 text-center text-[11px] leading-4 text-text-secondary">
              expenses
              <br />
              of revenue
            </span>
          </div>
        </div>
        <div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-xl border border-outline bg-surface-raised px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[#5a8963]" />
                Total expenses
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {currencyFormatter.format(record.total_expenses_deductions)}
              </p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-raised px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[#344638]" />
                Total revenue
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {currencyFormatter.format(revenue)}
              </p>
            </div>
          </div>
          <p
            className={`mt-3 rounded-xl px-4 py-3 text-sm leading-5 ${
              exceededRevenue
                ? 'border border-error-outline bg-error-surface text-error-text'
                : 'bg-surface-raised text-text-secondary'
            }`}
          >
            {exceededRevenue
              ? `Reported expenses exceed revenue by ${currencyFormatter.format(expenses - revenue)}.`
              : `Revenue above reported expenses: ${currencyFormatter.format(revenueAboveExpenses)}.`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-text-muted">
        This is a simple ratio of reported totals, not a measure of institutional
        health or reported net income. IPEDS accounting adjustments can make
        revenue less expenses differ from reported net income.
      </p>
    </section>
  )
}
