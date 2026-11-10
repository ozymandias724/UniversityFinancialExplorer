import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FinanceRecord } from '../../types/education'
import type { FinanceCategory } from './financeCategories'
import { compactCurrencyFormatter, currencyFormatter } from './formatters'

interface CategoryChartProps {
  title: string
  color: string
  categories: readonly FinanceCategory[]
  record: FinanceRecord
}

// A single chart renders either category list from financeCategories.ts.
export function CategoryChart({ title, color, categories, record }: CategoryChartProps) {
  // Omit unreported values from the chart, but list them below rather than treating them as zero.
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
      className="rounded-2xl border border-outline bg-surface-inset p-4"
    >
      <h4 className="mb-1 text-sm font-semibold text-text-primary">{title}</h4>
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
              <CartesianGrid horizontal={false} stroke="#343430" />
              <XAxis
                axisLine={false}
                domain={['auto', 'auto']}
                tick={{ fill: '#9c9b94', fontSize: 10 }}
                tickFormatter={(value: number) =>
                  compactCurrencyFormatter.format(value)
                }
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="name"
                tick={{ fill: '#c7c5be', fontSize: 11 }}
                tickLine={false}
                type="category"
                width={144}
              />
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
                labelStyle={{ color: '#f2f0eb', fontWeight: 600 }}
                cursor={{ fill: '#243c3b', fillOpacity: 0.75 }}
                wrapperStyle={{ zIndex: 20 }}
              />
              <Bar dataKey="amount" fill={color} maxBarSize={20} radius={[0, 5, 5, 0]}>
                <LabelList
                  dataKey="amount"
                  fill="#c7c5be"
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
        <p className="rounded-xl bg-surface-raised px-3 py-4 text-sm text-text-muted">
          No category values were reported for this year.
        </p>
      )}
      {unavailableCategories.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-text-muted">
          Not reported: {unavailableCategories.map((category) => category.label).join(', ')}.
        </p>
      )}
    </section>
  )
}
