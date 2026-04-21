import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9A9288', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2' }}>

      {/* nav */}
      <nav style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(26,24,20,0.08)', padding: '0 32px', background: 'rgba(250,247,242,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1A1814' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 10 L12 2 L21 10 L21 22 L3 22 Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
            <line x1="3" y1="14.5" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.75"/>
          </svg>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, letterSpacing: '-0.015em' }}>Underhaus</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user.avatar_url && (
            <img src={user.avatar_url} alt={user.name || user.email} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(26,24,20,0.1)' }} />
          )}
          <span style={{ fontSize: 14, color: '#5C564E' }}>{user.name || user.email}</span>
          <button onClick={handleLogout} style={{ fontSize: 13, color: '#9A9288', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', transition: 'color 200ms' }}
            onMouseEnter={e => e.target.style.color = '#B84A2E'}
            onMouseLeave={e => e.target.style.color = '#9A9288'}>
            Sign out
          </button>
        </div>
      </nav>

      {/* main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '56px 32px' }} className="animate-slide-up">

        {/* greeting */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            UNDERHAUS / DASHBOARD
          </p>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, letterSpacing: '-0.015em', lineHeight: 1.05, color: '#1A1814' }}>
            Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p style={{ color: '#5C564E', fontSize: 16, marginTop: 12 }}>
            Your deal discovery dashboard is coming soon.
          </p>
        </div>

        {/* account card */}
        <div style={{ background: 'white', border: '1px solid rgba(26,24,20,0.08)', borderRadius: 12, padding: 28, maxWidth: 480, marginBottom: 32 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Account</p>
          {[
            { label: 'Email', value: user.email },
            { label: 'Name', value: user.name || '—' },
            { label: 'Plan', value: user.plan.charAt(0).toUpperCase() + user.plan.slice(1) },
            { label: 'Role', value: user.role },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(26,24,20,0.06)' }}>
              <span style={{ fontSize: 14, color: '#9A9288' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1814' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* coming soon panel */}
        <div style={{ background: 'white', border: '1px solid rgba(26,24,20,0.08)', borderRadius: 12, padding: 28, maxWidth: 480 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Next up</p>
          {[
            'Search listings by zip code or address',
            'Underwrite against your financial profile',
            'Rank deals by cash-on-cash return',
            'Save and track your deal pipeline',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(26,24,20,0.06)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2D5A3D', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#5C564E' }}>{item}</span>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
