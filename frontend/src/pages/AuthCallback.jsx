import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../api/client'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = params.get('token')
    const reason = params.get('reason')

    if (token) {
      auth.setToken(token)
      navigate('/dashboard', { replace: true })
    } else {
      const msg = reason === 'account_deleted'
        ? 'This account has been deleted.'
        : reason === 'oauth_failed'
        ? 'OAuth sign-in failed. Please try again.'
        : 'Sign-in failed. Please try again.'
      setError(msg)
    }
  }, [params, navigate])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <p style={{ color: '#B84A2E', fontSize: 15, marginBottom: 20 }}>{error}</p>
          <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: '#1A1814', color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>
            Back to sign in
          </a>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
