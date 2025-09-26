/**
 * API client with automatic token refresh
 * Intercepts API calls and refreshes tokens when needed
 */

import { tokenRefreshManager } from './token-refresh'

interface ApiOptions extends RequestInit {
  skipAuth?: boolean
  skipRetry?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Get current access token
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      return null
    }

    return localStorage.getItem('accessToken') ||
           localStorage.getItem('access_token') ||
           sessionStorage.getItem('accessToken')
  }

  /**
   * Make authenticated API call with automatic token refresh
   */
  async fetch(url: string, options: ApiOptions = {}): Promise<Response> {
    const { skipAuth = false, skipRetry = false, ...fetchOptions } = options

    // Add authorization header if not skipping auth
    if (!skipAuth) {
      const token = this.getAccessToken()
      if (token) {
        // Ensure token is valid before making the request
        const isValid = await tokenRefreshManager.ensureValidToken(token)
        if (!isValid && !skipRetry) {
          throw new Error('Token refresh failed')
        }

        fetchOptions.headers = {
          'Authorization': `Bearer ${token}`,
          ...fetchOptions.headers
        }
      }
    }

    // Make the API call
    const response = await fetch(`${this.baseUrl}${url}`, fetchOptions)

    // If we get a 401 and haven't already retried, try to refresh and retry
    if (response.status === 401 && !skipAuth && !skipRetry) {
      console.log('[ApiClient] Received 401, attempting token refresh...')

      // Try to refresh the token
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        if (refreshData.success && refreshData.accessToken) {
          // Store new token with both keys
          localStorage.setItem('accessToken', refreshData.accessToken)
          localStorage.setItem('access_token', refreshData.accessToken)
          tokenRefreshManager.initializeWithToken(refreshData.accessToken)

          // Retry the original request with new token
          return this.fetch(url, { ...options, skipRetry: true })
        }
      }

      // If refresh failed, redirect to login
      console.error('[ApiClient] Token refresh failed, redirecting to login')
      window.location.href = '/login'
      throw new Error('Authentication failed')
    }

    return response
  }

  /**
   * Convenience methods
   */
  async get(url: string, options: ApiOptions = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' })
  }

  async post(url: string, data?: any, options: ApiOptions = {}): Promise<Response> {
    const body = data ? JSON.stringify(data) : undefined
    const headers: Record<string, string> = data ? { 'Content-Type': 'application/json' } : {}

    return this.fetch(url, {
      ...options,
      method: 'POST',
      body,
      headers: { ...headers, ...options.headers }
    })
  }

  async put(url: string, data?: any, options: ApiOptions = {}): Promise<Response> {
    const body = data ? JSON.stringify(data) : undefined
    const headers: Record<string, string> = data ? { 'Content-Type': 'application/json' } : {}

    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body,
      headers: { ...headers, ...options.headers }
    })
  }

  async delete(url: string, options: ApiOptions = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' })
  }

  /**
   * JSON response helpers
   */
  async getJson<T = any>(url: string, options: ApiOptions = {}): Promise<T> {
    const response = await this.get(url, options)
    if (!response.ok) {
      // Try to get response body for error details
      let errorData = null
      try {
        errorData = await response.json()
      } catch {
        // If can't parse JSON, ignore
      }

      const error = new Error(`API request failed: ${response.status} ${response.statusText}`) as any
      error.status = response.status
      error.data = errorData
      throw error
    }
    return response.json()
  }

  async postJson<T = any>(url: string, data?: any, options: ApiOptions = {}): Promise<T> {
    const response = await this.post(url, data, options)
    if (!response.ok) {
      // Try to get response body for error details
      let errorData = null
      try {
        errorData = await response.json()
      } catch {
        // If can't parse JSON, ignore
      }

      const error = new Error(`API request failed: ${response.status} ${response.statusText}`) as any
      error.status = response.status
      error.data = errorData
      throw error
    }
    return response.json()
  }

  async putJson<T = any>(url: string, data?: any, options: ApiOptions = {}): Promise<T> {
    const response = await this.put(url, data, options)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async deleteJson<T = any>(url: string, options: ApiOptions = {}): Promise<T> {
    const response = await this.delete(url, options)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
}

// Global API client instance
export const apiClient = new ApiClient()

/**
 * Legacy fetch wrapper for backward compatibility
 * Automatically handles authentication and token refresh
 */
export async function authenticatedFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  return apiClient.fetch(url, options)
}