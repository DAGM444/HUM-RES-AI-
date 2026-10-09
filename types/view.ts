export type View =
  | 'dashboard'
  | 'employee-profile'
  | 'performance-report'
  | 'pending-actions'
  | 'email-templates'
  | 'employee-chatbot'
  | 'hr-inbox'
  | 'hr-calendar'
  | 'hr-settings'
  | 'employee-directory'
  | 'performance-reports-list'
  | 'data-analytics'
  | 'attendance'
  | 'incidents';

/** Navigation target / view state — supports employeeId parameter for employee-profile */
export type ViewState =
  | { view: Exclude<View, 'employee-profile'>; employeeId?: never }
  | { view: 'employee-profile'; employeeId?: number };

export type NavTarget = ViewState;
