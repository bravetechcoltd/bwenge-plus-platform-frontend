export interface SSOConfig {
  targetUrl: string
  popupWidth: number
  popupHeight: number
}

const DEFAULT_SSO_CONFIG: SSOConfig = {
  targetUrl: process.env.NEXT_PUBLIC_ONGERA_SSO_URL || "",
  popupWidth: 500,
  popupHeight: 600,
}

/**
 * Handles SSO authentication with Ongera
 * @param userRole - User's role for determining authentication flow
 * @param config - Optional SSO configuration
 * @returns Promise<boolean> - Whether authentication was successful
 */
export default function Auth(userRole: string, config?: Partial<SSOConfig>): Promise<boolean> {
  return new Promise((resolve) => {
    const ssoConfig = { ...DEFAULT_SSO_CONFIG, ...config }
    
    // If not a system that requires SSO, resolve immediately
    if (userRole !== "gdv") {
      resolve(true)
      return
    }

    // Get current URL for return
    const returnUrl = window.location.origin
    
    // Open SSO popup
    const popup = window.open(
      `${ssoConfig.targetUrl}/sso/auth?return_url=${encodeURIComponent(returnUrl)}`,
      "ongeraSSO",
      `width=${ssoConfig.popupWidth},height=${ssoConfig.popupHeight},top=${(window.screen.height - ssoConfig.popupHeight) / 2},left=${(window.screen.width - ssoConfig.popupWidth) / 2}`
    )

    if (!popup) {
      resolve(false)
      return
    }

    // Message listener for SSO response
    const messageListener = (event: MessageEvent) => {
      // Validate origin
      if (event.origin !== ssoConfig.targetUrl) {
        return
      }

      try {
        const data = event.data
        
        if (data.type === 'SSO_SUCCESS') {
          // Close popup and clean up
          popup.close()
          window.removeEventListener("message", messageListener)
          
          // Process SSO token
          if (data.token) {
            // Store token and trigger BwengePlus authentication
            handleSSOToken(data.token)
              .then(() => resolve(true))
              .catch(() => resolve(false))
          } else {
            resolve(true)
          }
        } 
        else if (data.type === 'SSO_ERROR') {
          popup.close()
          window.removeEventListener("message", messageListener)
          resolve(false)
        }
        else if (data.type === 'SSO_CANCELLED') {
          popup.close()
          window.removeEventListener("message", messageListener)
          resolve(false)
        }
      } catch (error) {
        popup.close()
        window.removeEventListener("message", messageListener)
        resolve(false)
      }
    }

    // Add message listener
    window.addEventListener("message", messageListener)

    // Check if popup was closed by user
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed)
        window.removeEventListener("message", messageListener)
        resolve(false)
      }
    }, 1000)
  })
}

/**
 * Handles SSO token from Ongera and exchanges it for BwengePlus session
 */
async function handleSSOToken(ssoToken: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sso/consume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: ssoToken }),
    })

    if (!response.ok) {
      throw new Error('Failed to consume SSO token')
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'SSO token consumption failed')
    }

    // Redirect to success page or refresh current page
    if (data.data?.redirect_url) {
      window.location.href = data.data.redirect_url
    } else {
      window.location.reload()
    }
  } catch (error) {
    throw error
  }
}

/**
 * Checks if user has an active Ongera session
 */
export async function checkOngeraSession(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-ongera-session`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.success && data.data?.has_ongera_session === true
  } catch (error) {
    return false
  }
}

/**
 * Logs out from all systems (BwengePlus + Ongera)
 */
export async function logoutAllSystems(): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout?logout_all_systems=true`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    // Still proceed with client-side cleanup
  }
}

/**
 * Creates a URL for direct SSO login
 */
export function createSSOLoginUrl(returnUrl: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_ONGERA_SSO_URL || ''
  return `${baseUrl}/sso/auth?return_url=${encodeURIComponent(returnUrl)}`
}