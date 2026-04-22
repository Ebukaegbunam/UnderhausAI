const VERDICT_COLOR = {
  go: '#2D5A3D',
  maybe: '#8A6020',
  no_go: '#B84A2E',
  insufficient_data: '#9A9288',
}
const VERDICT_BG = {
  go: 'rgba(45,90,61,0.08)',
  maybe: 'rgba(138,96,32,0.08)',
  no_go: 'rgba(184,74,46,0.08)',
  insufficient_data: 'rgba(154,146,136,0.08)',
}
const VERDICT_LABEL = {
  go: 'GO',
  maybe: 'MAYBE',
  no_go: 'NO GO',
  insufficient_data: '—',
}

function fmt(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function fmtMo(n) {
  if (n == null) return '—'
  const v = Math.round(n)
  return `${v >= 0 ? '+' : ''}$${Math.abs(v).toLocaleString()}/mo`
}

export default function ListingCard({ listing, onSelect, onDeepUnderwrite }) {
  const uw = listing.underwriting
  const verdict = uw?.verdict

  return (
    <div
      onClick={() => onSelect(listing)}
      style={{
        background: 'white',
        border: '1px solid rgba(26,24,20,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 200ms, transform 200ms',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Image */}
      <div style={{ height: 148, background: '#F3EEE4', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {listing.image_url
          ? <img src={listing.image_url} alt={listing.address} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(26,24,20,0.2)" strokeWidth="1.5">
                <path d="M3 10L12 2l9 8v12H3z"/><line x1="3" y1="14.5" x2="21" y2="14.5"/>
              </svg>
            </div>
        }
        {verdict && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: VERDICT_BG[verdict],
            border: `1px solid ${VERDICT_COLOR[verdict]}`,
            borderRadius: 4,
            padding: '3px 8px',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: VERDICT_COLOR[verdict], fontFamily: 'JetBrains Mono, monospace' }}>
              {VERDICT_LABEL[verdict]}
            </span>
          </div>
        )}
        {listing.days_on_market != null && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(250,247,242,0.9)', borderRadius: 4, padding: '3px 8px' }}>
            <span style={{ fontSize: 10, color: '#5C564E', fontWeight: 500 }}>{listing.days_on_market}d on market</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#1A1814', fontFamily: "'Instrument Serif', serif" }}>{fmt(listing.price)}</p>
          {listing.property_type && (
            <span style={{ fontSize: 10, color: '#9A9288', background: '#F3EEE4', padding: '2px 7px', borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8 }}>
              {listing.property_type.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Address */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1814', lineHeight: 1.3 }}>{listing.address}</p>
          <p style={{ fontSize: 12, color: '#9A9288' }}>{listing.city}, {listing.state} {listing.zip_code}</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#5C564E' }}>
          {listing.beds != null && <span><strong style={{ color: '#1A1814' }}>{listing.beds}</strong> bd</span>}
          {listing.baths != null && <span><strong style={{ color: '#1A1814' }}>{listing.baths}</strong> ba</span>}
          {listing.sqft != null && <span><strong style={{ color: '#1A1814' }}>{listing.sqft.toLocaleString()}</strong> sqft</span>}
        </div>

        {/* Underwriting metrics */}
        {uw && (
          <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: '1px solid rgba(26,24,20,0.06)', marginTop: 'auto' }}>
            <div>
              <p style={{ fontSize: 10, color: '#9A9288', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Cash Flow</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: uw.cash_flow_monthly >= 0 ? '#2D5A3D' : '#B84A2E' }}>
                {fmtMo(uw.cash_flow_monthly)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#9A9288', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>CoC</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1814' }}>{uw.cash_on_cash_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#9A9288', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Cap Rate</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1814' }}>{uw.cap_rate_pct.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Deep Underwrite button */}
      <div style={{ padding: '0 16px 14px' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onDeepUnderwrite(listing)}
          style={{
            width: '100%',
            padding: '8px 0',
            fontSize: 12,
            fontWeight: 500,
            background: 'none',
            border: '1px solid rgba(26,24,20,0.15)',
            color: '#5C564E',
            cursor: 'pointer',
            transition: 'all 200ms',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A1814'; e.currentTarget.style.color = '#1A1814' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,24,20,0.15)'; e.currentTarget.style.color = '#5C564E' }}
        >
          Deep Underwriting →
        </button>
      </div>
    </div>
  )
}
