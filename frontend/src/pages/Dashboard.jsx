import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { api } from '../api/client'
import ProfilePanel from '../components/ProfilePanel'
import ListingCard from '../components/ListingCard'
import ListingDetail from '../components/ListingDetail'
import ComingSoonModal from '../components/ComingSoonModal'

const LANDING = import.meta.env.VITE_LANDING_URL
  ?? (import.meta.env.DEV ? 'http://localhost:3001' : '/')

const DEFAULT_PROFILE = {
  down_payment_pct: 20,
  cash_amount: null,
  annual_income: null,
  credit_score: 740,
  investment_goal: 'buy_and_hold',
  monthly_debt_payments: 0,
  vacancy_rate_pct: 8,
  management_fee_pct: 10,
  maintenance_pct: 5,
  capex_pct: 5,
  target_cash_on_cash_pct: 8,
}

const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000

function getSearchCacheKey(payload) {
  return `uh_sc|${payload.location}|${payload.radius_miles}|${payload.property_types.join(',')}|${payload.min_price ?? ''}|${payload.max_price ?? ''}`
}

function readSearchCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > SEARCH_CACHE_TTL_MS) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function writeSearchCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })) } catch { /* storage full */ }
}

function scoreToCreditRange(score) {
  if (score >= 760) return '760+'
  if (score >= 720) return '720-759'
  if (score >= 680) return '680-719'
  return 'below_680'
}

const PRICE_OPTIONS = [
  { label: 'No limit', value: '' },
  { label: '$50K', value: 50000 },
  { label: '$75K', value: 75000 },
  { label: '$100K', value: 100000 },
  { label: '$125K', value: 125000 },
  { label: '$150K', value: 150000 },
  { label: '$175K', value: 175000 },
  { label: '$200K', value: 200000 },
  { label: '$250K', value: 250000 },
  { label: '$300K', value: 300000 },
  { label: '$400K', value: 400000 },
  { label: '$500K', value: 500000 },
  { label: '$750K', value: 750000 },
  { label: '$1M', value: 1000000 },
  { label: '$1.5M', value: 1500000 },
  { label: '$2M+', value: 2000000 },
]

const PROPERTY_TYPE_OPTIONS = [
  { label: 'Multi-Family', value: 'MultiFamily' },
  { label: 'Single Family', value: 'SingleFamily' },
  { label: 'Condo', value: 'Condo' },
  { label: 'Townhouse', value: 'Townhouse' },
  { label: 'All Types', value: 'All' },
]

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '2px solid rgba(26,24,20,0.1)',
        borderTopColor: '#1A1814',
        animation: 'spin 700ms linear infinite',
      }} />
      <p style={{ fontSize: 13, color: '#9A9288' }}>Searching listings…</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(26,24,20,0.08)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 148, background: 'linear-gradient(90deg, #F3EEE4 25%, #FAF7F2 50%, #F3EEE4 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[80, 120, 60].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: 'linear-gradient(90deg, #F3EEE4 25%, #FAF7F2 50%, #F3EEE4 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.4s infinite' }} />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 768

  const [profile, setProfile] = useState(() => {
    try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem('uh_profile') ?? '{}') } }
    catch { return DEFAULT_PROFILE }
  })
  const [profileSaved, setProfileSaved] = useState(() => !!localStorage.getItem('uh_profile'))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [location, setLocation] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(5)
  const [propertyType, setPropertyType] = useState('MultiFamily')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uh_search_history') ?? '[]') }
    catch { return [] }
  })

  const [selectedListing, setSelectedListing] = useState(null)
  const [deepUnderwriteListing, setDeepUnderwriteListing] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => { document.title = 'Dashboard — Underhaus' }, [])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user, navigate])

  // Close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false)
  }, [isMobile])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, sidebarOpen])

  const handleProfileChange = useCallback((key, value) => {
    setProfile(p => ({ ...p, [key]: value }))
    setProfileSaved(false)
  }, [])

  const handleSaveProfile = useCallback(() => {
    localStorage.setItem('uh_profile', JSON.stringify(profile))
    setProfileSaved(true)
  }, [profile])

  const buildSearchPayload = useCallback((loc = location) => {
    const isCash = profile.down_payment_pct >= 100
    const user_profile = profileSaved ? {
      down_payment_pct: isCash ? 50 : profile.down_payment_pct,
      annual_income: profile.annual_income || null,
      credit_range: scoreToCreditRange(profile.credit_score ?? 740),
      investment_goal: profile.investment_goal,
      monthly_debt_payments: profile.monthly_debt_payments,
      vacancy_rate_pct: profile.vacancy_rate_pct,
      management_fee_pct: profile.management_fee_pct,
      maintenance_pct: profile.maintenance_pct,
      capex_pct: profile.capex_pct,
      target_cash_on_cash_pct: profile.target_cash_on_cash_pct,
    } : null
    return {
      location: loc,
      radius_miles: radiusMiles,
      property_types: [propertyType],
      status: 'ForSale',
      min_price: minPrice ? Number(minPrice) : null,
      max_price: maxPrice ? Number(maxPrice) : null,
      max_results: 50,
      user_profile,
    }
  }, [location, radiusMiles, propertyType, minPrice, maxPrice, profile, profileSaved])

  const runSearch = useCallback(async (loc = location) => {
    if (!loc.trim()) return
    setLoading(true)
    setError(null)

    const payload = buildSearchPayload(loc)
    const cacheKey = getSearchCacheKey(payload)
    const cached = readSearchCache(cacheKey)

    if (cached) {
      setResults(cached)
      setLoading(false)
      return
    }

    setResults(null)
    try {
      const data = await api.post('/listings/search', payload)
      setResults(data)
      writeSearchCache(cacheKey, data)

      const entry = { id: Date.now(), location: loc, timestamp: Date.now(), count: data.total_found, resolved: data.location_resolved }
      setHistory(h => {
        const next = [entry, ...h.filter(x => x.location !== loc)].slice(0, 10)
        localStorage.setItem('uh_search_history', JSON.stringify(next))
        return next
      })
    } catch (err) {
      setError(err.message || 'Search failed. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [location, buildSearchPayload])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9A9288', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  if (!user) return null

  const selectStyle = {
    padding: '8px 28px 8px 10px', fontSize: 13,
    border: '1px solid rgba(26,24,20,0.12)', borderRadius: 6,
    background: '#FAF7F2', color: '#1A1814', appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9288' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid rgba(26,24,20,0.08)',
        background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile profile toggle */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#5C564E', lineHeight: 0 }}
              aria-label="Toggle profile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </button>
          )}
          <a href={LANDING} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1A1814', textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
              <path d="M3 10L12 2l9 8v12H3z"/><line x1="3" y1="14.5" x2="21" y2="14.5"/>
            </svg>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, letterSpacing: '-0.01em' }}>Underhaus</span>
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && <span style={{ fontSize: 13, color: '#5C564E' }}>{user.name || user.email}</span>}
          <button onClick={handleLogout}
            style={{ fontSize: 12, color: '#9A9288', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', transition: 'color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.color = '#B84A2E'}
            onMouseLeave={e => e.currentTarget.style.color = '#9A9288'}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <ProfilePanel
            user={user}
            profile={profile}
            onChange={handleProfileChange}
            onSave={handleSaveProfile}
            saved={profileSaved}
          />
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '28px 32px' }}>

          {/* Profile nudge */}
          {!profileSaved && (
            <div style={{
              background: '#FEF3C7', border: '1px solid rgba(180,120,0,0.2)', borderRadius: 8,
              padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10,
              animation: 'fadeIn 300ms ease both',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A6020" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
              <p style={{ fontSize: 13, color: '#8A6020' }}>
                <strong>Save your investor profile</strong> {isMobile ? <><button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A6020', textDecoration: 'underline', fontSize: 13, padding: 0 }}>Open profile</button> to get</> : 'to get'} personalized underwriting on every listing.
              </p>
            </div>
          )}

          {/* Search bar */}
          <div style={{ background: 'white', border: '1px solid rgba(26,24,20,0.08)', borderRadius: 10, padding: isMobile ? '16px' : '20px 24px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#9A9288', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Search Listings</p>

            {/* Location row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder="ZIP or city, e.g. 60614 or Chicago, IL"
                style={{
                  flex: 1, minWidth: 0, padding: '10px 14px', fontSize: 14,
                  border: '1px solid rgba(26,24,20,0.12)', borderRadius: 6, background: '#FAF7F2',
                  color: '#1A1814', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#1A1814'}
                onBlur={e => e.target.style.borderColor = 'rgba(26,24,20,0.12)'}
              />
              <button
                onClick={() => runSearch()}
                disabled={loading || !location.trim()}
                style={{
                  padding: '10px 20px', background: '#1A1814', color: '#FAF7F2',
                  border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500,
                  cursor: loading || !location.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !location.trim() ? 0.5 : 1,
                  transition: 'all 200ms', flexShrink: 0,
                }}
                onMouseEnter={e => { if (!loading && location.trim()) e.currentTarget.style.background = '#2A2620' }}
                onMouseLeave={e => e.currentTarget.style.background = '#1A1814'}
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* Filter row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={radiusMiles} onChange={e => setRadiusMiles(Number(e.target.value))} style={selectStyle}>
                {[1, 2, 5, 10, 15, 25].map(v => <option key={v} value={v}>{v} mi</option>)}
              </select>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} style={selectStyle}>
                {PROPERTY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={minPrice} onChange={e => setMinPrice(e.target.value)}
                style={{ ...selectStyle, color: minPrice ? '#1A1814' : '#9A9288' }}>
                <option value="">Min price</option>
                {PRICE_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  style={{ ...selectStyle, color: maxPrice ? '#1A1814' : '#9A9288' }}>
                  <option value="">Max price</option>
                  {PRICE_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {(() => {
                  const cash = profile.cash_amount
                  const pct = profile.down_payment_pct
                  if (!cash || pct >= 100) return null
                  const suggested = Math.round(cash / (pct / 100))
                  return (
                    <button
                      onClick={() => {
                        const closest = PRICE_OPTIONS.filter(o => o.value).reduce((a, b) =>
                          Math.abs(b.value - suggested) < Math.abs(a.value - suggested) ? b : a
                        )
                        setMaxPrice(String(closest.value))
                      }}
                      style={{ fontSize: 11, color: '#2D5A3D', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', whiteSpace: 'nowrap' }}
                    >
                      ↑ Use suggested: ${(suggested / 1000).toFixed(0)}K
                    </button>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Search history */}
          {history.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setHistoryOpen(h => !h)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9288', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 10 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: historyOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
                Search History ({history.length})
              </button>
              {historyOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, animation: 'fadeIn 200ms ease both' }}>
                  {history.map(h => (
                    <button key={h.id} onClick={() => { setLocation(h.location); runSearch(h.location) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 12px', background: 'white',
                        border: '1px solid rgba(26,24,20,0.1)', borderRadius: 20,
                        fontSize: 12, color: '#5C564E', cursor: 'pointer',
                        transition: 'all 200ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A1814'; e.currentTarget.style.color = '#1A1814' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,24,20,0.1)'; e.currentTarget.style.color = '#5C564E' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                      </svg>
                      {h.location}
                      {h.count != null && <span style={{ color: '#9A9288', fontSize: 11 }}>· {h.count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(184,74,46,0.06)', border: '1px solid rgba(184,74,46,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#B84A2E' }}>{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div>
              <Spinner />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <div style={{ animation: 'fadeIn 300ms ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#5C564E' }}>
                  <strong style={{ color: '#1A1814' }}>{results.total_found}</strong> listings near <strong style={{ color: '#1A1814' }}>{results.location_resolved}</strong>
                  {results.data_source_status === 'mock' && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#9A9288', background: '#F3EEE4', padding: '2px 8px', borderRadius: 10 }}>mock data</span>
                  )}
                </p>
              </div>

              {results.listings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🏘</p>
                  <p style={{ fontSize: 15, color: '#5C564E', fontWeight: 500 }}>No listings found</p>
                  <p style={{ fontSize: 13, color: '#9A9288', marginTop: 6 }}>Try expanding your search radius or adjusting filters.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {results.listings.map(listing => (
                    <ListingCard
                      key={listing.zpid || listing.address}
                      listing={listing}
                      onSelect={setSelectedListing}
                      onDeepUnderwrite={setDeepUnderwriteListing}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!results && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '64px 0', animation: 'fadeIn 400ms ease both' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(26,24,20,0.15)" strokeWidth="1.25" style={{ margin: '0 auto 16px' }}>
                <path d="M3 10L12 2l9 8v12H3z"/><line x1="3" y1="14.5" x2="21" y2="14.5"/>
              </svg>
              <p style={{ fontSize: 15, color: '#9A9288', fontWeight: 500 }}>Enter a ZIP code or address to find deals</p>
              <p style={{ fontSize: 13, color: '#9A9288', marginTop: 6, opacity: 0.7 }}>
                {profileSaved ? 'Personalized underwriting will run on every result.' : 'Save your investor profile for underwriting on every result.'}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && (
        <>
          {sidebarOpen && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.4)', zIndex: 55, backdropFilter: 'blur(4px)', animation: 'fadeIn 200ms ease both' }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div style={{
            position: 'fixed', top: 56, left: 0, bottom: 0, zIndex: 56,
            width: 'min(300px, 85vw)',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1)',
            background: '#FAF7F2',
            boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
            overflowY: 'auto',
          }}>
            <ProfilePanel
              user={user}
              profile={profile}
              onChange={handleProfileChange}
              onSave={handleSaveProfile}
              saved={profileSaved}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Modals */}
      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onDeepUnderwrite={listing => { setSelectedListing(null); setDeepUnderwriteListing(listing) }}
        />
      )}
      {deepUnderwriteListing && (
        <ComingSoonModal
          listing={deepUnderwriteListing}
          onClose={() => setDeepUnderwriteListing(null)}
        />
      )}
    </div>
  )
}
