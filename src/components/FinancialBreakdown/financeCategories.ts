import type { FinanceRecord } from '../../types/education'

export interface FinanceCategory {
  key: keyof FinanceRecord
  label: string
}

// These fields are selected examples from the normalized IPEDS finance record,
// not exhaustive lists of revenue and expenses.
export const revenueCategories = [
  { key: 'rev_tuition_fees_net', label: 'Net tuition and fees' },
  { key: 'rev_appropriations_state', label: 'State appropriations' },
  { key: 'rev_fed_approps_grants', label: 'Federal appropriations and grants' },
  { key: 'rev_gifts_grants_contracts', label: 'Gifts, grants, and contracts' },
  { key: 'rev_auxiliary_enterprises_net', label: 'Auxiliary enterprises, net' },
  { key: 'rev_investment_return', label: 'Investment return' },
] as const satisfies readonly FinanceCategory[]

export const expenseCategories = [
  { key: 'exp_instruc_total', label: 'Instruction' },
  { key: 'exp_research_total', label: 'Research' },
  { key: 'exp_pub_serv_total', label: 'Public service' },
  { key: 'exp_acad_supp_total', label: 'Academic support' },
  { key: 'exp_student_serv_total', label: 'Student services' },
  { key: 'exp_inst_supp_total', label: 'Institutional support' },
  { key: 'exp_aux_ent_total', label: 'Auxiliary enterprises' },
] as const satisfies readonly FinanceCategory[]
