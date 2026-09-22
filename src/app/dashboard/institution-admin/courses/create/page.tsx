"use client"

import { useState } from "react"
import { CourseCreationWizard } from "@/components/course/course-creation-wizard"

export default function CreateCoursePage() {


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900/10 dark:to-gray-800/20 rounded-lg">
        <CourseCreationWizard />
    </div>
  )
}
