import { jwtDecode } from "jwt-decode"

interface DecodedToken {
  userId: string
  email: string
  role: string
  exp: number
  iat: number
}

export function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null

  try {
    const token = localStorage.getItem("LIS_Etoken")
    if (!token) return null

    // Remove quotes if token is stored as JSON string
    return JSON.parse(token)
  } catch {
    return null
  }
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwtDecode<DecodedToken>(token)

    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      return null
    }

    return decoded
  } catch (error) {
    console.error("Token decode error:", error)
    return null
  }
}

export function getUserFromToken(): DecodedToken | null {
  const token = getTokenFromStorage()
  if (!token) return null

  return decodeToken(token)
}
