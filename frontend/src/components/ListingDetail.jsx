const VERDICT_COLOR = {
  go: '#2D5A3D', maybe: '#8A6020', no_go: '#B84A2E', insufficient_data: '#9A9288',
}
const VERDICT_LABEL = {
  go: 'GO', maybe: 'MAYBE', no_go: 'NO GO', insufficient_data: 'Insufficient Data',
}

function fmt(n) {
  if (!n) return '—'
  return `$${Number(n).toLocaleString()}`
}
function fmtPct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—' }
function fmtMo(n) {
  if (n == null) return '—'
  const v = Math.round(n)
  return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString()}/mo`
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(26,24,20,0.05)' }}>
      <span style={{ fontSize: 13, color: '#9A9288' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: color || '#1A1814' }}>{value}</span>
    </div>
  )
}

export default function ListingDetail({ listing, onClose, onDeepUnderwrite }) {
  if (!listing) return null
  const uw = listing.underwriting

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 200ms ease both' }} />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 720,
          maxHeight: '88vh',
          background: '#FAF7F2',
          borderRadius: '16px 16px 0 0',
          overflowY: 'auto',
          animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1) both',
          zIndex: 1,
        }}
      >
        {/* Image header */}
        <div style={{ height: 220, background: '#F3EEE4', position: 'relative', flexShrink: 0 }}>
          {listing.image_url
            ? <img src={listing.image_url} alt={listing.address} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(26,24,20,0.15)" strokeWidth="1.25">
                  <path d="M3 10L12 2l9 8v12H3z"/><line x1="3" y1="14.5" x2="21" y2="14.5"/>
                </svg>
              </div>
          }
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(250,247,242,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1814" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          {uw?.verdict && (
            <div style={{
              position: 'absolute', bottom: 14, left: 14,
              background: VERDICT_COLOR[uw.verdict],
              color: 'white', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', padding: '4px 12px', borderRadius: 4,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {VERDICT_LABEL[uw.verdict]}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px 32px' }}>
          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: '#1A1814', lineHeight: 1.2 }}>
                {listing.price ? `$${Number(listing.price).toLocaleString()}` : 'Price unavailable'}
              </h2>
              {listing.zillow_url && (
                <a href={listing.zillow_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#9A9288', whiteSpace: 'nowrap', marginTop: 6, textDecoration: 'underline' }}>
                  View on Zillow
                </a>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1814', marginTop: 4 }}>{listing.address}</p>
            <p style={{ fontSize: 13, color: '#9A9288' }}>{listing.city}, {listing.state} {listing.zip_code}</p>
          </div>

          {/* Property stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Beds', value: listing.beds ?? '—' },
              { label: 'Baths', value: listing.baths ?? '—' },
              { label: 'Sqft', value: listing.sqft ? listing.sqft.toLocaleString() : '—' },
              { label: 'Year Built', value: listing.year_built ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'white', border: '1px solid rgba(26,24,20,0.06)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: '#1A1814' }}>{value}</p>
                <p style={{ fontSize: 11, color: '#9A9288', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Property details */}
          <div style={{ background: 'white', border: '1px solid rgba(26,24,20,0.06)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#9A9288', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Property Details</p>
            <Row label="Type" value={listing.property_type || '—'} />
            <Row label="Price / sqft" value={listing.price_per_sqft ? `$${listing.price_per_sqft}` : '—'} />
            <Row label="Lot size" value={listing.lot_sqft ? `${listing.lot_sqft.toLocaleString()} sqft` : '—'} />
            <Row label="HOA fee" value={listing.hoa_fee ? `$${listing.hoa_fee}/mo` : 'None'} />
            <Row label="Annual taxes" value={listing.annual_tax ? fmt(listing.annual_tax) : '—'} />
            <Row label="Zestimate" value={listing.zestimate ? fmt(listing.zestimate) : '—'} />
            <Row label="Rent Zestimate" value={listing.rent_zestimate ? `${fmt(listing.rent_zestimate)}/mo` : '—'} />
            {listing.days_on_market != null && <Row label="Days on market" value={`${listing.days_on_market} days`} />}
          </div>

          {/* Underwriting */}
          {uw ? (
            <div style={{ background: 'white', border: '1px solid rgba(26,24,20,0.06)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: '#9A9288', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Underwriting</p>

              <div style={{ background: VERDICT_COLOR[uw.verdict] + '10', border: `1px solid ${VERDICT_COLOR[uw.verdict]}30`, borderRadius: 6, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: VERDICT_COLOR[uw.verdict], fontWeight: 500 }}>{uw.verdict_reason}</p>
                {uw.flags.length > 0 && uw.flags.map((f, i) => (
                  <p key={i} style={{ fontSize: 11, color: '#9A9288', marginTop: 4 }}>⚑ {f}</p>
                ))}
              </div>

              <Row label="Monthly rent (est.)" value={fmt(uw.estimated_monthly_rent) + '/mo'} />
              <Row label="Mortgage" value={fmt(Math.round(uw.mortgage_payment)) + '/mo'} />
              <Row label="Total expenses" value={fmt(Math.round(uw.total_expenses_monthly)) + '/mo'} />
              <Row label="Cash flow" value={fmtMo(uw.cash_flow_monthly)} color={uw.cash_flow_monthly >= 0 ? '#2D5A3D' : '#B84A2E'} />
              <Row label="Cash-on-cash" value={fmtPct(uw.cash_on_cash_pct)} />
              <Row label="Cap rate" value={fmtPct(uw.cap_rate_pct)} />
              <Row label="GRM" value={uw.gross_rent_multiplier ? uw.gross_rent_multiplier.toFixed(1) : '—'} />
              <Row label="DSCR" value={uw.dscr ? uw.dscr.toFixed(2) : '—'} />
              <Row label="Loan amount" value={fmt(uw.loan_amount)} />
              <Row label="Down payment" value={`${fmt(uw.down_payment_dollars)} (${uw.down_payment_pct}%)`} />
              <Row label="Est. rate" value={fmtPct(uw.estimated_rate_pct)} />
            </div>
          ) : (
            <div style={{ background: '#F3EEE4', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#9A9288' }}>Save your investor profile to see underwriting for this property.</p>
            </div>
          )}

          {/* Deep underwriting CTA */}
          <button
            onClick={() => onDeepUnderwrite(listing)}
            style={{
              width: '100%', padding: '13px 0',
              background: '#1A1814', color: '#FAF7F2',
              border: 'none', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'background 200ms', borderRadius: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2A2620'}
            onMouseLeave={e => e.currentTarget.style.background = '#1A1814'}
          >
            Deep Underwriting →
          </button>
        </div>
      </div>
    </div>
  )
}
