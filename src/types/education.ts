export interface ApiResponse<T> {
  count: number
  next: string | null
  results: T[]
}

// Directory records are normalized here so UI components do not depend on API field names.
export interface Institution {
  unitid: number
  name: string
  city: string | null
  stateAbbreviation: string | null
  control: number | null
}

export interface FinanceRecord {
  unitid: number
  year: number
  total_revenues_additions: number | null
  total_expenses_deductions: number | null
  income_net: number | null
  assets: number | null
  liabilities: number | null
  endowment_end: number | null
  est_fte: number | null
  rev_tuition_fees_net: number | null
  rev_appropriations_state: number | null
  rev_fed_approps_grants: number | null
  rev_gifts_grants_contracts: number | null
  rev_auxiliary_enterprises_net: number | null
  rev_investment_return: number | null
  exp_instruc_total: number | null
  exp_research_total: number | null
  exp_pub_serv_total: number | null
  exp_acad_supp_total: number | null
  exp_student_serv_total: number | null
  exp_inst_supp_total: number | null
  exp_aux_ent_total: number | null
}

// Keep request lifecycle states explicit so loading, empty, and error states cannot be conflated.
export type RequestStatus = 'idle' | 'loading' | 'ready' | 'error'
