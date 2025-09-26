/**
 * Client-side automatic token refresh utility
 * Prevents users from being logged out due to expired tokens
 */

interface TokenInfo {
  exp: number
  iat: number
}

class TokenRefreshManager {
  private refreshTimer: NodeJS.Timeout | null = null
  private refreshPromise: Promise<boolean> | null = null
  private isRefreshing = false


  /**
   * Check if token is close to expiry (within 2 minutes)
   */
  private isTokenNearExpiry(tokenInfo: TokenInfo): boolean {
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = tokenInfo.exp - now
    return timeUntilExpiry <= 120 // 2 minutes
  }


  /**
   * Public wrapper for decodeToken
   */
  public decodeToken(token: string): TokenInfo | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        exp: payload.exp,
        iat: payload.iat
      }
    } catch (error) {
      console.error('[TokenRefresh] Failed to decode token:', error)
      return null
    }
  }

  /**
   * Public wrapper for isTokenExpired
   */
  public isTokenExpired(tokenInfo: TokenInfo): boolean {
    const now = Math.floor(Date.now() / 1000)
    return tokenInfo.exp <= now
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performRefresh()

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include refresh token cookie
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('[TokenRefresh] Refresh failed:', response.status)
        // If refresh fails and we're not on login page, redirect
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return false
      }

      const data = await response.json()
      if (!data.success || !data.accessToken) {
        console.error('[TokenRefresh] Invalid refresh response:', data)
        // If refresh fails and we're not on login page, redirect
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return false
      }

      // Validate that the new token is valid and not expired
      const tokenInfo = this.decodeToken(data.accessToken)
      if (!tokenInfo || this.isTokenExpired(tokenInfo)) {
        console.error('[TokenRefresh] Received expired token from refresh')
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return false
      }

      // Store new token and schedule next refresh
      this.scheduleRefresh(data.accessToken)
      return true

    } catch (error) {
      console.error('[TokenRefresh] Refresh request failed:', error)
      // If refresh fails and we're not on login page, redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return false
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(token: string): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    const tokenInfo = this.decodeToken(token)
    if (!tokenInfo) {
      console.error('[TokenRefresh] Cannot schedule refresh - invalid token')
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = tokenInfo.exp - now

    // Schedule refresh 2 minutes before expiry, or immediately if already close
    const refreshIn = Math.max(0, (timeUntilExpiry - 120) * 1000)

    console.log(`[TokenRefresh] Scheduled refresh in ${Math.floor(refreshIn / 1000)} seconds`)

    this.refreshTimer = setTimeout(async () => {
      console.log('[TokenRefresh] Auto-refreshing token...')
      await this.refreshToken()
    }, refreshIn)
  }

  /**
   * Initialize token refresh manager with current token
   */
  public initializeWithToken(token: string): void {
    const tokenInfo = this.decodeToken(token)
    if (!tokenInfo) {
      console.error('[TokenRefresh] Cannot initialize - invalid token')
      return
    }

    // Don't initialize refresh for expired tokens
    if (this.isTokenExpired(tokenInfo)) {
      console.log('[TokenRefresh] Token already expired, not scheduling refresh')
      return
    }

    console.log('[TokenRefresh] Initialized with token expiring at:', new Date(tokenInfo.exp * 1000))
    this.scheduleRefresh(token)
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  public async ensureValidToken(token: string): Promise<boolean> {
    const tokenInfo = this.decodeToken(token)
    if (!tokenInfo) {
      return false
    }

    if (this.isTokenNearExpiry(tokenInfo)) {
      console.log('[TokenRefresh] Token near expiry, refreshing...')
      return await this.refreshToken()
    }

    return true
  }

  /**
   * Clean up refresh timer
   */
  public cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.isRefreshing = false
    this.refreshPromise = null
  }
}

// Global instance
const tokenRefreshManager = new TokenRefreshManager()

export { tokenRefreshManager }

/**
 * Initialize token refresh on app start
 */
export function initializeTokenRefresh(): void {
  // Don't initialize on auth pages to prevent refresh loops
  if (typeof window !== 'undefined' &&
      (window.location.pathname.includes('/login') ||
       window.location.pathname.includes('/register') ||
       window.location.pathname.includes('/forgot') ||
       window.location.pathname.includes('/reset'))) {
    console.log('[TokenRefresh] Skipping initialization on auth page')
    return
  }

  // Get token from authorization header if available
  const token = getStoredToken()
  if (token) {
    // Check if token is expired and clean it up if so
    const tokenInfo = tokenRefreshManager.decodeToken(token)
    if (tokenInfo && tokenRefreshManager.isTokenExpired(tokenInfo)) {
      console.log('[TokenRefresh] Clearing expired token')
      removeToken()
      return
    }
    tokenRefreshManager.initializeWithToken(token)
  }
}

/**
 * Get stored token (implementation depends on your token storage strategy)
 */
function getStoredToken(): string | null {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return null
  }

  // Try to get from localStorage with both keys for compatibility
  return localStorage.getItem('accessToken') ||
         localStorage.getItem('access_token') ||
         sessionStorage.getItem('accessToken') ||
         null
}

/**
 * Store token (implementation depends on your token storage strategy)
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem('accessToken', token)
  localStorage.setItem('access_token', token) // Legacy key for backward compatibility
  tokenRefreshManager.initializeWithToken(token)
}

/**
 * Remove stored token
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('accessToken')
  localStorage.removeItem('access_token') // Legacy key
  sessionStorage.removeItem('accessToken')
  tokenRefreshManager.cleanup()
}