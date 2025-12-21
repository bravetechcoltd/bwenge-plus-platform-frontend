// @ts-nocheck

"use client"

import { CourseTreeBuilder } from "../tree-builder/course-tree-builder"
import type { Course, Module } from "@/types"

interface TreeBuilderStepProps {
  courseData: Partial<Course>
  setCourseData: (data: Partial<Course>) => void
  modules: Module[]
  skipAssessmentBuilder?: boolean
  setSkipAssessmentBuilder?: (skip: boolean) => void
  setModules: (modules: Module[]) => void
  onNext: () => void
  onPrevious: () => void
}

export function TreeBuilderStep({
  courseData,
  setCourseData,
  modules,
  setModules,
  onNext,
  onPrevious,
}: TreeBuilderStepProps) {
  return (
    <CourseTreeBuilder
      modules={modules}
      setModules={setModules}
      courseData={courseData}
      onNext={onNext}
      onPrevious={onPrevious}
    />
  )
}