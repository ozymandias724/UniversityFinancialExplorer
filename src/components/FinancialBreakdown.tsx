import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FinanceRecord } from '../types/education'

interface FinanceCategory {
  key: keyof FinanceRecord
  label: string
}

interface FinancialBreakdownProps {
  record: FinanceRecord
}

const revenueCategories = [
  { key: 'rev_tuition_fees_net', label: 'Net tuition and fees' },
  { key: 'rev_appropriations_state', label: 'State appropriations' },
  { key: 'rev_fed_approps_grants', label: 'Federal appropriations and grants' },
  { key: 'rev_gifts_grants_contracts', label: 'Gifts, grants, and contracts' },
  { key: 'rev_auxiliary_enterprises_net', label: 'Auxiliary enterprises, net' },
  { key: 'rev_investment_return', label: 'Investment return' },
] as const satisfies readonly FinanceCategory[]

const expenseCategories = [
  { key: 'exp_instruc_total', label: 'Instruction' },
  { key: 'exp_research_total', label: 'Research' },
  { key: 'exp_pub_serv_total', label: 'Public service' },
  { key: 'exp_acad_supp_total', label: 'Academic support' },
  { key: 'exp_student_serv_total', label: 'Student services' },
  { key: 'exp_inst_supp_total', label: 'Institutional support' },
  { key: 'exp_aux_ent_total', label: 'Auxiliary enterprises' },
] as const satisfies readonly FinanceCategory[]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const percentageFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

export function FinancialBreakdown({ record }: FinancialBreakdownProps) {
  return (
    <section className="mt-8 border-t border-[#edf0eb] pt-7">
      <RevenueCoverageDonut record={record} />

      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#63806c]">
          Where the money comes from and goes
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-[#23372a]">
          Selected reported categories
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#758279]">
          These categories are not a complete breakdown and should not be added
          together as totals. A missing value means it was not reported.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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

      <p className="mt-4 rounded-xl bg-[#f7f9f6] px-4 py-3 text-xs leading-5 text-[#718078]">
        Investment returns can include valuation changes, so they may not
        represent recurring revenue. Values are shown as reported by IPEDS.
      </p>
    </section>
  )
}

function RevenueCoverageDonut({ record }: FinancialBreakdownProps) {
  const revenue = record.total_revenues_additions

  if (
    revenue === null ||
    record.total_expenses_deductions === null ||
    revenue <= 0 ||
    record.total_expenses_deductions < 0
  ) {
    return (
      <section className="mb-8 rounded-2xl border border-[#e8ece7] bg-[#fbfcfa] p-5">
        <h3 className="text-base font-semibold text-[#344a3a]">
          Revenue coverage
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#718078]">
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
      className="mb-8 rounded-2xl border border-[#dfe8df] bg-[#f7faf6] p-5 sm:p-6"
    >
      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#63806c]">
          Overall financial snapshot
        </p>
        <h3 className="text-base font-semibold text-[#344a3a]">
          Revenue coverage
        </h3>
      </div>
      <div className="grid items-center gap-4 md:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)]">
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
                  <Cell fill="#dce8dc" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: '1px solid #e1e6df',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value) =>
                    currencyFormatter.format(Number(value ?? 0))
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-2xl font-semibold tracking-tight text-[#233d2d]">
              {percentageFormatter.format(expenseShare * 100)}%
            </span>
            <span className="mt-1 text-center text-[11px] leading-4 text-[#718078]">
              expenses
              <br />
              of revenue
            </span>
          </div>
        </div>
        <div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-xl border border-[#e8ece7] bg-white px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-[#718078]">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[#5a8963]" />
                Total expenses
              </p>
              <p className="mt-1 text-lg font-semibold text-[#344a3a]">
                {currencyFormatter.format(record.total_expenses_deductions)}
              </p>
            </div>
            <div className="rounded-xl border border-[#e8ece7] bg-white px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-[#718078]">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[#dce8dc]" />
                Total revenue
              </p>
              <p className="mt-1 text-lg font-semibold text-[#344a3a]">
                {currencyFormatter.format(revenue)}
              </p>
            </div>
          </div>
          <p
            className={`mt-3 rounded-xl px-4 py-3 text-sm leading-5 ${
              exceededRevenue
                ? 'border border-[#f0d7d1] bg-[#fff7f5] text-[#8e3f31]'
                : 'bg-white text-[#52645a]'
            }`}
          >
            {exceededRevenue
              ? `Reported expenses exceed revenue by ${currencyFormatter.format(expenses - revenue)}.`
              : `Revenue above reported expenses: ${currencyFormatter.format(revenueAboveExpenses)}.`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#718078]">
        This is a simple ratio of reported totals, not a measure of institutional
        health or reported net income. IPEDS accounting adjustments can make
        revenue less expenses differ from reported net income.
      </p>
    </section>
  )
}

interface CategoryChartProps {
  title: string
  color: string
  categories: readonly FinanceCategory[]
  record: FinanceRecord
}

function CategoryChart({ title, color, categories, record }: CategoryChartProps) {
  const data = categories.flatMap((category) => {
    const amount = record[category.key]
    return typeof amount === 'number'
      ? [{ name: category.label, amount }]
      : []
  })
  const unavailableCategories = categories.filter(
    (category) => record[category.key] === null,
  )

  return (
    <section
      aria-label={`${title} categories for ${record.year}`}
      className="rounded-2xl border border-[#e8ece7] bg-[#fbfcfa] p-4"
    >
      <h4 className="mb-1 text-sm font-semibold text-[#344a3a]">{title}</h4>
      {data.length > 0 ? (
        <div
          aria-label={`${title} by category. Focus the chart and use arrow keys to explore values.`}
          className="mt-2 h-[240px] w-full"
          role="img"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="#e8ece7" />
              <XAxis
                axisLine={false}
                domain={['auto', 'auto']}
                tick={{ fill: '#829087', fontSize: 10 }}
                tickFormatter={(value: number) =>
                  compactCurrencyFormatter.format(value)
                }
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="name"
                tick={{ fill: '#596b60', fontSize: 11 }}
                tickLine={false}
                type="category"
                width={144}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e1e6df',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value) =>
                  currencyFormatter.format(Number(value ?? 0))
                }
                labelStyle={{ color: '#344a3a', fontWeight: 600 }}
              />
              <Bar dataKey="amount" fill={color} maxBarSize={20} radius={[0, 5, 5, 0]}>
                <LabelList
                  dataKey="amount"
                  fill="#52645a"
                  formatter={(value) =>
                    compactCurrencyFormatter.format(Number(value))
                  }
                  position="right"
                  style={{ fontSize: 10 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-xl bg-white px-3 py-4 text-sm text-[#718078]">
          No category values were reported for this year.
        </p>
      )}
      {unavailableCategories.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-[#819087]">
          Not reported: {unavailableCategories.map((category) => category.label).join(', ')}.
        </p>
      )}
    </section>
  )
}
