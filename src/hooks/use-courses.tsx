"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "./use-auth"
import type { 
  Course, 
  CourseType, 
  CourseStatus, 
  CreateCourseRequest, 
  UpdateCourseRequest,
  ApiResponse,
  PaginatedResponse
} from "@/types"
import useSWR, { mutate } from "swr"
import { fetcher, postFetcher, putFetcher, deleteFetcher } from "@/lib/fetcher"

interface CoursesContextType {
    useCoursesByType: (type: "live" | "draft" | "all" | "org" | "enrolled") => {
    courses: Course[]
    loading: boolean
    error: any
    mutate: () => void
  }
  // Course fetching
  useCourses: (params?: {
    type?: CourseType
    status?: CourseStatus
    institutionId?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    courses: Course[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    loading: boolean
    error: Error | undefined
    mutate: () => void
  }
  
  // Single course
  useCourse: (id: string) => {
    course: Course | undefined
    loading: boolean
    error: Error | undefined
    mutate: () => void
  }
  
  // Course actions
  createCourse: (data: CreateCourseRequest, files?: File[]) => Promise<ApiResponse<Course>>
  updateCourse: (id: string, data: UpdateCourseRequest, files?: File[]) => Promise<ApiResponse<Course>>
  deleteCourse: (id: string) => Promise<ApiResponse>
  publishCourse: (id: string) => Promise<ApiResponse<Course>>
  unpublishCourse: (id: string) => Promise<ApiResponse<Course>>
  
  // Instructor courses
  useInstructorCourses: (params?: {
    status?: CourseStatus
    type?: CourseType
    page?: number
    limit?: number
  }) => {
    courses: Course[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    loading: boolean
    error: Error | undefined
    mutate: () => void
  }
  
  // Public MOOCs
  usePublicMOOCs: (params?: {
    category?: string
    level?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    courses: Course[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    loading: boolean
    error: Error | undefined
    mutate: () => void
  }
  
  // Cache utilities
  updateCourseInCache: (id: string, updates: Partial<Course>) => Promise<void>
  invalidateCourseCache: () => Promise<void>
}

const CoursesContext = createContext<CoursesContextType | undefined>(undefined)

export function CoursesProvider({ children }: { children: ReactNode }) {
  const { token,user } = useAuth()


    const useCoursesByType = (type: "live" | "draft" | "all" | "org" | "enrolled") => {
    // Generate cache key based on type and user
    const getCacheKey = () => {
      if (!user || !token) return null

      const baseUrl = process.env.NEXT_PUBLIC_API_URL

      switch (type) {
        case "live":
          return `${baseUrl}/courses/instructor/${user.id}/live/courses`
        case "all":
          return `${baseUrl}/courses/instructor/${user.id}/courses`
        case "org":
          return `${baseUrl}/courses/${user.institution?.id}/courses`
        case "draft":
          return `${baseUrl}/courses/${user.institution?.id}/draft/courses`
        case "enrolled":
          return `${baseUrl}/enrollments/user-enrollments`
        default:
          return null
      }
    }

    const { data, error, isLoading, mutate } = useSWR(
      getCacheKey(), 
      (url: string) => {
        if (type === 'enrolled') {
        return postFetcher(url, { arg: { userId: user!.id } }, token!)
        } else {
          return fetcher(url, token!)
        }
      }, {
      // Revalidate on focus (when user switches back to tab)
      revalidateOnFocus: true,
      // Revalidate on reconnect
      revalidateOnReconnect: true,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
      // Cache data for 5 minutes
      focusThrottleInterval: 5 * 60 * 1000,
      // Retry on error
      shouldRetryOnError: true,
      errorRetryCount: 3,
    })

    return {
      courses: data?.courses || data?.enrollments || [],
      loading: isLoading,
      error,
      mutate,
    }
  }

  // Generic courses fetcher
  const useCourses = (params = {}) => {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const queryString = queryParams.toString()
    const url = `${process.env.NEXT_PUBLIC_API_URL}/courses${queryString ? `?${queryString}` : ''}`

    const { data, error, isLoading, mutate } = useSWR<ApiResponse<PaginatedResponse<Course>>>(
      token && url ? url : null,
      (url: string) => fetcher(url, token!),
      {
        revalidateOnFocus: false,
        dedupingInterval: 2000,
      }
    )

    return {
      courses: data?.data?.courses || [],
      pagination: data?.data?.pagination,
      loading: isLoading,
      error,
      mutate,
    }
  }

  // Single course fetcher
  const useCourse = (id: string) => {
    const { data, error, isLoading, mutate } = useSWR<ApiResponse<Course>>(
      token && id ? `${process.env.NEXT_PUBLIC_API_URL}/courses/${id}` : null,
      (url: string) => fetcher(url, token!),
      {
        revalidateOnFocus: false,
      }
    )

    return {
      course: data?.data,
      loading: isLoading,
      error,
      mutate,
    }
  }

  // Instructor courses fetcher
  const useInstructorCourses = (params = {}) => {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const queryString = queryParams.toString()
    const url = `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/my-courses${queryString ? `?${queryString}` : ''}`

    const { data, error, isLoading, mutate } = useSWR<ApiResponse<PaginatedResponse<Course>>>(
      token && url ? url : null,
      (url: string) => fetcher(url, token!),
      {
        revalidateOnFocus: false,
      }
    )

    return {
      courses: data?.data?.courses || [],
      pagination: data?.data?.pagination,
      loading: isLoading,
      error,
      mutate,
    }
  }

  // Public MOOCs fetcher
  const usePublicMOOCs = (params = {}) => {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const queryString = queryParams.toString()
    const url = `${process.env.NEXT_PUBLIC_API_URL}/courses/mooc${queryString ? `?${queryString}` : ''}`

    const { data, error, isLoading, mutate } = useSWR<ApiResponse<PaginatedResponse<Course>>>(
      url,
      fetcher,
      {
        revalidateOnFocus: false,
      }
    )

    return {
      courses: data?.data?.courses || [],
      pagination: data?.data?.pagination,
      loading: isLoading,
      error,
      mutate,
    }
  }

  // Course creation with file uploads
  const createCourse = async (data: CreateCourseRequest, files: File[] = []): Promise<ApiResponse<Course>> => {
    const formData = new FormData()
    
    // Append course data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'modules' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value))
        }
      }
    })

    // Append files
    files.forEach(file => {
      formData.append('files', file)
    })

    return postFetcher(`${process.env.NEXT_PUBLIC_API_URL}/courses`, formData, token!, false)
  }

  // Course update with file uploads
  const updateCourse = async (id: string, data: UpdateCourseRequest, files: File[] = []): Promise<ApiResponse<Course>> => {
    const formData = new FormData()
    
    // Append course data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'modules' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value))
        }
      }
    })

    // Append files
    files.forEach(file => {
      formData.append('files', file)
    })

    return putFetcher(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`, formData, token!, false)
  }

  // Course deletion
  const deleteCourse = async (id: string): Promise<ApiResponse> => {
    return deleteFetcher(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`, token!)
  }

  // Publish course
  const publishCourse = async (id: string): Promise<ApiResponse<Course>> => {
    return putFetcher(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/publish`, {}, token!)
  }

  // Unpublish course
  const unpublishCourse = async (id: string): Promise<ApiResponse<Course>> => {
    return putFetcher(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/unpublish`, {}, token!)
  }

  // Update course in cache
  const updateCourseInCache = async (id: string, updates: Partial<Course>) => {
    const cacheKeys = [
      `${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`,
      `${process.env.NEXT_PUBLIC_API_URL}/courses`,
      `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/my-courses`,
      `${process.env.NEXT_PUBLIC_API_URL}/courses/mooc`,
    ]

    await Promise.all(
      cacheKeys.map(key =>
        mutate(
          key,
          (data?: ApiResponse<any>) => {
            if (!data) return data

            if (data.data && 'id' in data.data && data.data.id === id) {
              return {
                ...data,
                data: { ...data.data, ...updates },
              }
            }

            if (data.data && 'courses' in data.data) {
              return {
                ...data,
                data: {
                  ...data.data,
                  courses: data.data.courses.map((course: Course) =>
                    course.id === id ? { ...course, ...updates } : course
                  ),
                },
              }
            }

            return data
          },
          { revalidate: false }
        )
      )
    )
  }

  // Invalidate all course caches
  const invalidateCourseCache = async () => {
    const cacheKeys = [
      `${process.env.NEXT_PUBLIC_API_URL}/courses`,
      `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/my-courses`,
      `${process.env.NEXT_PUBLIC_API_URL}/courses/mooc`,
    ]

    await Promise.all(cacheKeys.map(key => mutate(key)))
  }

  return (
    <CoursesContext.Provider
      value={{
        useCourses,
        useCoursesByType,
        useCourse,
        createCourse,
        updateCourse,
        deleteCourse,
        publishCourse,
        unpublishCourse,
        useInstructorCourses,
        usePublicMOOCs,
        updateCourseInCache,
        invalidateCourseCache,
      }}
    >
      {children}
    </CoursesContext.Provider>
  )
}

export function useCourses() {
  const context = useContext(CoursesContext)
  if (context === undefined) {
    throw new Error("useCourses must be used within a CoursesProvider")
  }
  return context
}