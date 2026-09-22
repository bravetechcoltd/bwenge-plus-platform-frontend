
export function isTempId(id: string): boolean {
  return id.startsWith('temp-') || id.length < 10
}

/**
 * Generates a unique temporary ID for new entities
 */
export function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Cleans module data before sending to backend
 * Removes temporary IDs and ensures proper structure
 */
export function cleanModuleForBackend(module: any, index: number): any {
  const cleanedModule: any = {
    title: module.title || '',
    description: module.description || '',
    order_index: module.order_index ?? index + 1,
    estimated_duration_hours: module.estimated_duration_hours || 0,
    is_published: module.is_published || false,
    lessons: (module.lessons || []).map((lesson: any, lessonIndex: number) => 
      cleanLessonForBackend(lesson, lessonIndex)
    )
  }

  // Only include ID if it's NOT a temporary ID
  if (module.id && !isTempId(module.id)) {
    cleanedModule.id = module.id
  }

  // Handle module final assessment
  if (module.final_assessment) {
    cleanedModule.final_assessment = cleanFinalAssessmentForBackend(module.final_assessment)
  }

  return cleanedModule
}

/**
 * Cleans lesson data before sending to backend
 */
function cleanLessonForBackend(lesson: any, index: number): any {
  const cleanedLesson: any = {
    title: lesson.title || '',
    content: lesson.content || '',
    video_url: lesson.video_url || lesson.videoUrl || '',
    thumbnail_url: lesson.thumbnail_url || '',
    duration_minutes: lesson.duration_minutes || lesson.duration || 0,
    order_index: lesson.order_index ?? index + 1,
    type: lesson.type || 'VIDEO',
    is_preview: lesson.is_preview || false,
    is_published: lesson.is_published || false,
    resources: lesson.resources || []
  }

  // Only include ID if it's NOT a temporary ID
  if (lesson.id && !isTempId(lesson.id)) {
    cleanedLesson.id = lesson.id
  }

  // Clean assessments
  if (lesson.assessments && Array.isArray(lesson.assessments)) {
    cleanedLesson.assessments = lesson.assessments.map((assessment: any) => 
      cleanAssessmentForBackend(assessment)
    )
  }

  return cleanedLesson
}

/**
 * Cleans assessment data before sending to backend
 */
function cleanAssessmentForBackend(assessment: any): any {
  const cleanedAssessment: any = {
    title: assessment.title || '',
    description: assessment.description || '',
    type: assessment.type || 'QUIZ',
    passing_score: assessment.passing_score || assessment.passingScore || 70,
    max_attempts: assessment.max_attempts || 3,
    time_limit_minutes: assessment.time_limit_minutes || assessment.timeLimit || null,
    is_published: assessment.is_published || false,
    questions: (assessment.questions || []).map((q: any, qIndex: number) => ({
      question: q.question || '',
      type: q.type || 'MULTIPLE_CHOICE',
      options: q.options || [],
      correct_answer: q.correct_answer || q.correctAnswer || '',
      points: q.points || 1,
      order_index: q.order_index ?? qIndex + 1
    }))
  }

  // Only include ID if it's NOT a temporary ID
  if (assessment.id && !isTempId(assessment.id)) {
    cleanedAssessment.id = assessment.id
  }

  return cleanedAssessment
}

/**
 * Cleans final assessment data before sending to backend
 */
function cleanFinalAssessmentForBackend(finalAssessment: any): any {
  const cleanedFinal: any = {
    title: finalAssessment.title || 'Final Assessment',
    type: finalAssessment.type === 'ASSESSMENT' || finalAssessment.type === 'assessment' 
      ? 'assessment' 
      : 'project',
    description: finalAssessment.description || finalAssessment.instructions || '',
    instructions: finalAssessment.instructions || finalAssessment.description || '',
    passing_score: finalAssessment.passing_score || finalAssessment.passingScore || 70,
    time_limit_minutes: finalAssessment.time_limit_minutes || finalAssessment.timeLimit || null,
    fileRequired: finalAssessment.requires_file_submission || finalAssessment.fileRequired || false,
    questions: (finalAssessment.questions || []).map((q: any, qIndex: number) => ({
      question: q.question || '',
      type: q.type || 'MULTIPLE_CHOICE',
      options: q.options || q.pairs || [],
      correct_answer: q.correct_answer || q.correctAnswer || '',
      points: q.points || 1,
      order_index: q.order_index ?? qIndex + 1
    }))
  }

  // Only include ID if it's NOT a temporary ID
  if (finalAssessment.id && !isTempId(finalAssessment.id)) {
    cleanedFinal.id = finalAssessment.id
  }

  return cleanedFinal
}

/**
 * Marks an entity with sync status
 */
export function markEntityStatus(entity: any, status: 'local' | 'synced' | 'modified' | 'deleting'): any {
  return {
    ...entity,
    _status: status,
    updated_at: new Date()
  }
}

/**
 * Prepares modules data for backend update
 */
export function prepareModulesForUpdate(modules: any[]): any[] {
  return modules.map((module, index) => cleanModuleForBackend(module, index))
}

/**
 * Validates module structure before sending
 */
export function validateModuleStructure(modules: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!Array.isArray(modules)) {
    errors.push('Modules must be an array')
    return { valid: false, errors }
  }

  if (modules.length === 0) {
    errors.push('At least one module is required')
    return { valid: false, errors }
  }

  modules.forEach((module, moduleIndex) => {
    if (!module.title || module.title.trim() === '') {
      errors.push(`Module ${moduleIndex + 1}: Title is required`)
    }

    if (module.lessons && Array.isArray(module.lessons)) {
      module.lessons.forEach((lesson: any, lessonIndex: number) => {
        if (!lesson.title || lesson.title.trim() === '') {
          errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: Title is required`)
        }
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Syncs backend response with local state
 */
export function syncModulesFromBackend(backendModules: any[]): any[] {
  return backendModules.map(module => ({
    ...module,
    _status: 'synced' as const,
    lessons: module.lessons?.map((lesson: any) => ({
      ...lesson,
      _status: 'synced' as const,
      assessments: lesson.assessments?.map((assessment: any) => ({
        ...assessment,
        _status: 'synced' as const
      })) || []
    })) || [],
    final_assessment: module.final_assessment ? {
      ...module.final_assessment,
      _status: 'synced' as const
    } : undefined
  }))
}

/**
 * Finds an entity by ID across the module tree
 */
export function findEntityById(modules: any[], entityId: string): { 
  entity: any; 
  type: 'module' | 'lesson' | 'assessment' | 'final_assessment' | null;
  moduleId?: string;
  lessonId?: string;
} {
  // Check modules
  for (const module of modules) {
    if (module.id === entityId) {
      return { entity: module, type: 'module' }
    }

    // Check lessons
    if (module.lessons) {
      for (const lesson of module.lessons) {
        if (lesson.id === entityId) {
          return { entity: lesson, type: 'lesson', moduleId: module.id }
        }

        // Check assessments
        if (lesson.assessments) {
          for (const assessment of lesson.assessments) {
            if (assessment.id === entityId) {
              return { 
                entity: assessment, 
                type: 'assessment', 
                moduleId: module.id,
                lessonId: lesson.id
              }
            }
          }
        }
      }
    }

    // Check final assessment
    if (module.final_assessment?.id === entityId) {
      return { 
        entity: module.final_assessment, 
        type: 'final_assessment',
        moduleId: module.id
      }
    }
  }

  return { entity: null, type: null }
}

/**
 * Updates entity status by ID
 */
export function updateEntityStatus(
  modules: any[], 
  entityId: string, 
  status: 'local' | 'synced' | 'modified' | 'deleting'
): any[] {
  return modules.map(module => {
    if (module.id === entityId) {
      return markEntityStatus(module, status)
    }

    return {
      ...module,
      lessons: module.lessons?.map((lesson: any) => {
        if (lesson.id === entityId) {
          return markEntityStatus(lesson, status)
        }

        return {
          ...lesson,
          assessments: lesson.assessments?.map((assessment: any) => 
            assessment.id === entityId 
              ? markEntityStatus(assessment, status)
              : assessment
          )
        }
      }),
      final_assessment: module.final_assessment?.id === entityId
        ? markEntityStatus(module.final_assessment, status)
        : module.final_assessment
    }
  })
}