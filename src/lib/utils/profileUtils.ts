export interface ProfileCompletionStatus {
  completed: boolean;
  percentage: number;
  missing: string[];
}

export const checkProfileCompletion = (user: any): ProfileCompletionStatus => {
  const requiredFields = {
    basic: ['first_name', 'last_name', 'bio'],
    academic: ['profile.institution_name', 'profile.department'],
    interests: ['profile.research_interests']
  };

  const missing: string[] = [];
  let completedCount = 0;
  let totalCount = 0;

  // Check basic fields
  requiredFields.basic.forEach(field => {
    totalCount++;
    if (user[field]) completedCount++;
    else missing.push(field.replace('_', ' '));
  });

  // Check academic fields
  requiredFields.academic.forEach(field => {
    totalCount++;
    const value = field.split('.').reduce((obj, key) => obj?.[key], user);
    if (value) completedCount++;
    else missing.push(field.split('.')[1].replace('_', ' '));
  });

  // Check research interests
  totalCount++;
  if (user.profile?.research_interests?.length > 0) completedCount++;
  else missing.push('research interests');

  // Account type specific checks
  if (user.account_type === 'Diaspora') {
    totalCount += 2;
    if (user.city) completedCount++;
    else missing.push('city');
    if (user.country) completedCount++;
    else missing.push('country');
  }

  const percentage = Math.round((completedCount / totalCount) * 100);
  const completed = percentage === 100;

  return { completed, percentage, missing };
};