import api from "./api";

export interface AuditLog {
  id: string;
  user_id: string | null;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  } | null;
  institution_id: string | null;
  institution?: {
    id: string;
    name: string;
  } | null;
  action: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  description: string;
  metadata: any;
  ip_address: string;
  user_agent: string;
  session_token: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  institution_id: string | null;
  is_system_role: boolean;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
  institution_id: string | null;
  granted_at: string;
  expires_at: string | null;
}

export interface SystemHealth {
  id: string;
  type: string;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "MAINTENANCE";
  response_time_ms: number;
  metrics: any;
  message: string;
  details: any;
  issues: Array<{
    component: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: string;
  }>;
  created_at: string;
}

export interface HealthCheckResponse {
  overall_status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "MAINTENANCE";
  last_updated: string;
  checks: SystemHealth[];
  issues: SystemHealth["issues"];
  metrics: {
    activeUsers: number;
    activeCourses: number;
    activeEnrollments: number;
    responseTimeAvg: number;
  };
}

export const PERMISSIONS = {
  // User Management
  'users.view': 'View Users',
  'users.create': 'Create Users',
  'users.edit': 'Edit Users',
  'users.delete': 'Delete Users',
  'users.manage_roles': 'Manage User Roles',
  
  // Institution Management
  'institutions.view': 'View Institutions',
  'institutions.create': 'Create Institutions',
  'institutions.edit': 'Edit Institutions',
  'institutions.delete': 'Delete Institutions',
  'institutions.manage_members': 'Manage Institution Members',
  
  // Course Management
  'courses.view': 'View Courses',
  'courses.create': 'Create Courses',
  'courses.edit': 'Edit Courses',
  'courses.delete': 'Delete Courses',
  'courses.publish': 'Publish Courses',
  'courses.approve': 'Approve Courses',
  
  // Content Management
  'content.view': 'View Content',
  'content.create': 'Create Content',
  'content.edit': 'Edit Content',
  'content.delete': 'Delete Content',
  'content.moderate': 'Moderate Content',
  
  // Enrollment Management
  'enrollments.view': 'View Enrollments',
  'enrollments.manage': 'Manage Enrollments',
  'enrollments.approve': 'Approve Enrollments',
  'enrollments.export': 'Export Enrollments',
  
  // Analytics
  'analytics.view': 'View Analytics',
  'analytics.export': 'Export Reports',
  'analytics.system': 'View System Analytics',
  
  // System Settings
  'settings.view': 'View Settings',
  'settings.edit': 'Edit Settings',
  'settings.security': 'Manage Security Settings',
  
  // Audit Logs
  'audit.view': 'View Audit Logs',
  'audit.export': 'Export Audit Logs',
  
  // Roles & Permissions
  'roles.view': 'View Roles',
  'roles.create': 'Create Roles',
  'roles.edit': 'Edit Roles',
  'roles.delete': 'Delete Roles',
  
  // API Access
  'api.keys': 'Manage API Keys',
  'api.access': 'API Access',
  
  // System Health
  'health.view': 'View System Health',
  'health.manage': 'Manage System Health',
};

export const AUDIT_ACTIONS = {
  // Authentication & Authorization
  USER_LOGIN: "User Login",
  USER_LOGOUT: "User Logout",
  LOGIN_FAILED: "Login Failed",
  PASSWORD_CHANGE: "Password Change",
  PASSWORD_RESET: "Password Reset",
  TWO_FACTOR_ENABLED: "2FA Enabled",
  TWO_FACTOR_DISABLED: "2FA Disabled",
  
  // User Management
  USER_CREATED: "User Created",
  USER_UPDATED: "User Updated",
  USER_DELETED: "User Deleted",
  USER_ACTIVATED: "User Activated",
  USER_DEACTIVATED: "User Deactivated",
  ROLE_ASSIGNED: "Role Assigned",
  ROLE_REVOKED: "Role Revoked",
  
  // Institution Management
  INSTITUTION_CREATED: "Institution Created",
  INSTITUTION_UPDATED: "Institution Updated",
  INSTITUTION_DELETED: "Institution Deleted",
  MEMBER_ADDED: "Member Added",
  MEMBER_REMOVED: "Member Removed",
  MEMBER_ROLE_UPDATED: "Member Role Updated",
  
  // Course Management
  COURSE_CREATED: "Course Created",
  COURSE_UPDATED: "Course Updated",
  COURSE_DELETED: "Course Deleted",
  COURSE_PUBLISHED: "Course Published",
  COURSE_UNPUBLISHED: "Course Unpublished",
  
  // Enrollment Management
  ENROLLMENT_APPROVED: "Enrollment Approved",
  ENROLLMENT_REJECTED: "Enrollment Rejected",
  ENROLLMENT_CANCELLED: "Enrollment Cancelled",
  ACCESS_CODE_GENERATED: "Access Code Generated",
  ACCESS_CODE_USED: "Access Code Used",
  
  // System Settings
  SYSTEM_SETTINGS_UPDATED: "System Settings Updated",
  SECURITY_SETTINGS_UPDATED: "Security Settings Updated",
  ROLE_CREATED: "Role Created",
  ROLE_UPDATED: "Role Updated",
  ROLE_DELETED: "Role Deleted",
  
  // Content Management
  CONTENT_CREATED: "Content Created",
  CONTENT_UPDATED: "Content Updated",
  CONTENT_DELETED: "Content Deleted",
  CONTENT_MODERATED: "Content Moderated",
  
  // Security Events
  PERMISSION_CHANGED: "Permission Changed",
  API_KEY_GENERATED: "API Key Generated",
  API_KEY_REVOKED: "API Key Revoked",
  SUSPICIOUS_ACTIVITY: "Suspicious Activity",
  
  // Data Operations
  DATA_EXPORTED: "Data Exported",
  DATA_IMPORTED: "Data Imported",
  DATA_DELETED: "Data Deleted",
};

export const SEVERITY_COLORS = {
  INFO: { bg: "#e5f6fd", text: "#0284c7" },
  WARNING: { bg: "#fff4e5", text: "#b45309" },
  ERROR: { bg: "#fee9e7", text: "#b91c1c" },
  CRITICAL: { bg: "#fef2f2", text: "#991b1b" },
};

export const HEALTH_STATUS_COLORS = {
  HEALTHY: { bg: "#e6f7e6", text: "#166534" },
  DEGRADED: { bg: "#fff4e5", text: "#b45309" },
  UNHEALTHY: { bg: "#fee9e7", text: "#b91c1c" },
  MAINTENANCE: { bg: "#f3f4f6", text: "#4b5563" },
};

class SecurityApi {
  // ==================== AUDIT LOGS ====================

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
    severity?: string;
    userId?: string;
    institutionId?: string;
    search?: string;
  }) {
    const response = await api.get("/security/audit", { params });
    return response.data;
  }

  async getAuditLogSummary(params?: { days?: number; institutionId?: string }) {
    const response = await api.get("/security/audit/summary", { params });
    return response.data;
  }

  async getAuditLogDetails(id: string) {
    const response = await api.get(`/security/audit/${id}`);
    return response.data;
  }

  async getUserAuditTrail(userId: string, params?: { limit?: number; offset?: number }) {
    const response = await api.get(`/security/audit/user/${userId}`, { params });
    return response.data;
  }

  async getInstitutionAuditTrail(institutionId: string, params?: { page?: number; limit?: number }) {
    const response = await api.get(`/security/audit/institution/${institutionId}`, { params });
    return response.data;
  }

  async clearAuditLogs(olderThan: string) {
    const response = await api.delete("/security/audit/clear", { params: { olderThan } });
    return response.data;
  }

  // ==================== ACCESS CONTROL ====================

  async getRoles(params?: { institutionId?: string; includeSystem?: boolean }) {
    const response = await api.get("/security/roles", { params });
    return response.data;
  }

  async getRole(id: string) {
    const response = await api.get(`/security/roles/${id}`);
    return response.data;
  }

  async createRole(data: {
    name: string;
    display_name: string;
    description?: string;
    permissions: string[];
    institution_id?: string;
  }) {
    const response = await api.post("/security/roles", data);
    return response.data;
  }

  async updateRole(
    id: string,
    data: {
      name?: string;
      display_name?: string;
      description?: string;
      permissions?: string[];
      is_active?: boolean;
    }
  ) {
    const response = await api.put(`/security/roles/${id}`, data);
    return response.data;
  }

  async deleteRole(id: string) {
    const response = await api.delete(`/security/roles/${id}`);
    return response.data;
  }

  async getRoleStatistics(params?: { institutionId?: string }) {
    const response = await api.get("/security/roles/stats", { params });
    return response.data;
  }

  async getUserRoles(userId: string, params?: { institutionId?: string }) {
    const response = await api.get(`/security/users/${userId}/roles`, { params });
    return response.data;
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    data?: { institutionId?: string; expiresAt?: string }
  ) {
    const response = await api.post(`/security/users/${userId}/roles/${roleId}`, data);
    return response.data;
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
    data?: { institutionId?: string }
  ) {
    const response = await api.delete(`/security/users/${userId}/roles/${roleId}`, { data });
    return response.data;
  }

  async checkPermission(
    userId: string,
    permission: string,
    params?: { institutionId?: string }
  ) {
    const response = await api.get(`/security/users/${userId}/permissions/check`, {
      params: { permission, ...params },
    });
    return response.data;
  }

  async getUserPermissions(userId: string, params?: { institutionId?: string }) {
    const response = await api.get(`/security/users/${userId}/permissions`, { params });
    return response.data;
  }

  async bulkAssignRoles(data: {
    userIds: string[];
    roleId: string;
    institutionId?: string;
    expiresAt?: string;
  }) {
    const response = await api.post("/security/roles/bulk-assign", data);
    return response.data;
  }

  // ==================== SYSTEM HEALTH ====================

  async getSystemHealth() {
    const response = await api.get("/security/health");
    return response.data;
  }

  async runHealthCheck() {
    const response = await api.post("/security/health/check");
    return response.data;
  }

  async getHealthHistory(params?: { type?: string; hours?: number }) {
    const response = await api.get("/security/health/history", { params });
    return response.data;
  }

  async getSystemMetrics(params?: { period?: string }) {
    const response = await api.get("/security/health/metrics", { params });
    return response.data;
  }

  async getComponentHealth(component: string) {
    const response = await api.get(`/security/health/component/${component}`);
    return response.data;
  }

  async getIncidentHistory(params?: { days?: number }) {
    const response = await api.get("/security/health/incidents", { params });
    return response.data;
  }

  async acknowledgeIncident(id: string) {
    const response = await api.post(`/security/health/incidents/${id}/acknowledge`);
    return response.data;
  }
}

export const securityApi = new SecurityApi();