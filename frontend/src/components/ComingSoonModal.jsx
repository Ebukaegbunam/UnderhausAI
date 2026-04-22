export default function ComingSoonModal({ listing, onClose }) {
  if (!listing) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.5)', backdropFilter: 'blur(6px)', animation: 'fadeIn 200ms ease both' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#FAF7F2',
          borderRadius: 12,
          padding: '36px 40px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1) both',
          zIndex: 1,
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9A9288', padding: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3EEE4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1814" strokeWidth="1.75">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
        </div>

        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Coming Soon</p>

        <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: '#1A1814', lineHeight: 1.2, marginBottom: 12 }}>
          Deep Underwriting
        </h3>

        <p style={{ fontSize: 14, color: '#5C564E', lineHeight: 1.6, marginBottom: 8 }}>
          Full AI-powered analysis for <strong style={{ color: '#1A1814' }}>{listing.address}</strong> — comps, rent projections, rehab estimates, and a full deal memo.
        </p>

        <p style={{ fontSize: 13, color: '#9A9288', lineHeight: 1.5 }}>
          We're building this now. You'll be first to know when it's live.
        </p>

        <button
          onClick={onClose}
          style={{ marginTop: 28, width: '100%', padding: '12px 0', background: '#1A1814', color: '#FAF7F2', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 200ms' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2A2620'}
          onMouseLeave={e => e.currentTarget.style.background = '#1A1814'}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
