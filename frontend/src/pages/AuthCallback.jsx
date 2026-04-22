import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../api/client'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => { document.title = 'Signing in — Underhaus' }, [])

  useEffect(() => {
    const token = params.get('token')
    const reason = params.get('reason')

    if (token) {
      auth.setToken(token)
      navigate('/dashboard', { replace: true })
    } else {
      const msg = reason === 'account_deleted'
        ? 'This account has been deleted.'
        : 'Sign-in failed. Trying again…'
      setError(msg)
    }
  }, [params, navigate])

  // Auto-redirect back to login so the user can retry without any manual step
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => navigate('/login', { replace: true }), 2500)
    return () => clearTimeout(timer)
  }, [error, navigate])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <p style={{ color: '#B84A2E', fontSize: 15, marginBottom: 8 }}>{error}</p>
          <p style={{ color: '#9A9288', fontSize: 13 }}>Redirecting you back…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <svg style={{ animation: 'spin 1s linear infinite', width: 24, height: 24, margin: '0 auto 16px', display: 'block' }} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="rgba(26,24,20,0.12)" strokeWidth="2.5"/>
          <path d="M12 2 A10 10 0 0 1 22 12" stroke="#1A1814" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <p style={{ color: '#5C564E', fontSize: 14 }}>Signing you in…</p>
      </div>
    </div>
  )
}
