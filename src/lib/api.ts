import axios from "axios"
import Cookies from "js-cookie"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'

console.log('🔧 API Base URL:', API_BASE_URL)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000, // ✅ Increased from 10000ms to 30000ms (30 seconds)
})

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("bwenge_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      toast.error("Request timeout. The server is taking too long to respond.")
    } else if (error.response) {
      const { status, data } = error.response

      // if (status === 401) {
      //   toast.error("Sesxxzxzzxxzsion expired. Please log in again.")
      //   Cookies.remove("bwenge_token")
      //   Cookies.remove("bwenge_user")
      //   if (typeof window !== "undefined") {
      //     window.location.href = "/login"
      //   }
      
      // } 
      
      if (status === 403) {
        toast.error(data.message || "You do not have permission to perform this action.")
      } else if (status === 404) {
        toast.error(data.message || "Resource not found.")
      } else if (status === 400) {
        toast.error(data.message || "Bad request.")
      } else if (status === 409) {
        toast.error(data.message || "Conflict occurred.")
      } else {
        toast.error(data.message || "An unexpected error occurred.")
      }
    } else if (error.request) {
      toast.error("No response from server. Please check your connection.")
    } else {
      toast.error("Request failed. Please try again.")
    }
    return Promise.reject(error)
  },
)

export default api