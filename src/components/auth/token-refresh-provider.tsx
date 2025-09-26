'use client'

import { useEffect } from 'react'
import { initializeTokenRefresh } from '@/lib/auth/token-refresh'

/**
 * Token Refresh Provider
 * Initializes automatic token refresh when the app loads
 */
export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize token refresh on client-side mount
    initializeTokenRefresh()
  }, [])

  return <>{children}</>
}