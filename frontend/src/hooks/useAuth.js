import { useState, useEffect, useCallback } from 'react'
import { api, auth } from '../api/client'

export function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    if (!auth.isLoggedIn()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await api.get('/auth/me')
      setUser(me)
    } catch {
      auth.clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  const logout = useCallback(async () => {
    try { await api.delete('/auth/session') } catch { /* already invalid */ }
    auth.clearToken()
    setUser(null)
  }, [])

  return { user, loading, logout, refetch: fetchUser }
}
