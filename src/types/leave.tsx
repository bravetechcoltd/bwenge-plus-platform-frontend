export enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum LeaveType {
  ANNUAL = "annual",
  SICK = "sick",
  MATERNITY = "maternity",
  PATERNITY = "paternity",
  EMERGENCY = "emergency",
  UNPAID = "unpaid",
}

export interface User {
  user_id: number
  username: string
  name: string
  email: string
  role: string
  department: string
  position: string
}

export interface Leave {
  leave_id: number
  employee: User
  start_date: string
  end_date: string
  leave_type: LeaveType
  reason?: string
  status: LeaveStatus
  approved_by?: string
  approved_date?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  employee_id: number
  year: number
  annual_leave: {
    total_allocated: number
    used: number
    remaining: number
  }
  sick_leave: {
    total_allocated: number
    used: number
    remaining: number
  }
  other_leave: {
    used: number
  }
}

export interface LeaveSummary {
  employee_id: number
  year: number
  total_leaves: number
  approved_leaves: number
  pending_leaves: number
  rejected_leaves: number
  leave_by_type: {
    annual: number
    sick: number
    maternity: number
    paternity: number
    emergency: number
    unpaid: number
  }
  recent_leaves: Leave[]
}

export interface CreateLeaveRequest {
  employee_id: number
  start_date: string
  end_date: string
  leave_type: LeaveType
  reason?: string
}

export interface ApproveRejectRequest {
  status: LeaveStatus.APPROVED | LeaveStatus.REJECTED
  rejection_reason?: string
}

export interface LeaveFilters {
  page?: number
  limit?: number
  employee_id?: number
  status?: LeaveStatus
  leave_type?: LeaveType
  start_date?: string
  end_date?: string
}

export interface PaginatedLeaveResponse {
  leaves: Leave[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
