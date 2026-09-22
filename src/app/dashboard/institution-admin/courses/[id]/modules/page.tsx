"use client"

import { use } from "react"
import  {ModulesListComponent } from "@/components/course/modules-list-component"

export default function EditCourseModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div className="container mx-auto px-4 py-8">
      <ModulesListComponent
        courseId={id}
        backLink={`/dashboard/system-admin/courses/${id}`}
        backLabel="Back to Course"
        role="SYSTEM_ADMIN"
      />
    </div>
  )
}