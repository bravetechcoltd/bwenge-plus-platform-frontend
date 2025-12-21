export const getRoleDashboardPath = (role: string): string => {
  const roleMap: Record<string, string> = {
    'SYSTEM_ADMIN': '/dashboard/system-admin',
    'INSTITUTION_ADMIN': '/dashboard/institution-admin',
    'CONTENT_CREATOR': '/dashboard/content-creator',
    'INSTRUCTOR': '/dashboard/instructor',
    'LEARNER': '/dashboard/learner',
    'ADMIN': '/dashboard/system-admin', 
  }
  
  return roleMap[role] || '/dashboard/learner'
}

export const getRoleDisplayName = (role: string): string => {
  const displayMap: Record<string, string> = {
    'SYSTEM_ADMIN': 'System Administrator',
    'INSTITUTION_ADMIN': 'Institution Administrator',
    'CONTENT_CREATOR': 'Content Creator',
    'INSTRUCTOR': 'Instructor',
    'LEARNER': 'Learner',
    'ADMIN': 'Administrator',
  }
  
  return displayMap[role] || 'User'
}

// Check if user can access a specific path
export const canAccessPath = (userRole: string, path: string): boolean => {
  const rolePaths: Record<string, string[]> = {
    'SYSTEM_ADMIN': ['/dashboard/system-admin', '/dashboard/admin'],
    'INSTITUTION_ADMIN': ['/dashboard/institution-admin'],
    'CONTENT_CREATOR': ['/dashboard/content-creator'],
    'INSTRUCTOR': ['/dashboard/instructor'],
    'LEARNER': ['/dashboard/learner', '/dashboard/user'],
  }
  
  const allowedPaths = rolePaths[userRole] || []
  return allowedPaths.some(allowedPath => path.startsWith(allowedPath))
}