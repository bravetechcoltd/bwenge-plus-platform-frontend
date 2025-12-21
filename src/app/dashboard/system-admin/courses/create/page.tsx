"use client"

import { useState } from "react"
import { CourseCreationWizard } from "@/components/course/course-creation-wizard"

export default function CreateCoursePage() {



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4 md:p-6">
        <CourseCreationWizard />
    </div>
  )
}