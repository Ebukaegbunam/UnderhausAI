const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 20px', background: '#1A1814', color: '#FAF7F2',
  fontSize: 14, fontWeight: 500, textDecoration: 'none',
  transition: 'background 200ms, transform 200ms', border: 'none',
}
const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 20px', background: 'transparent', color: '#1A1814',
  fontSize: 14, fontWeight: 500, textDecoration: 'none',
  border: '1px solid #1A1814', transition: 'background 200ms',
}

export default function FinalCTA() {
  return (
    <section id="final" style={{ padding: '160px 0 120px', borderTop: '1px solid rgba(26,24,20,0.08)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 2 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5C564E', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1A1814', marginRight: 10 }} />
            Stop reading listings, start reading <em style={{ marginLeft: 4 }}>numbers</em>
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', letterSpacing: '0.04em' }}>04 / 04</span>
        </div>

        <h2 className="reveal" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 600, fontSize: 'clamp(44px,7vw,96px)', lineHeight: 0.98, letterSpacing: '-0.025em', maxWidth: 900, margin: '0 auto 40px' }}>
          Every listing, <em style={{ fontStyle: 'italic', fontWeight: 500 }}>fully underwritten</em>.<br />Before you ever tour.
        </h2>

        <p className="fade-up" style={{ fontSize: 18, color: '#5C564E', maxWidth: 520, margin: '0 auto 40px' }}>
          Five minutes to set up. The next qualified deal in your inbox could be tomorrow.
        </p>

        <div className="fade-up" style={{ display: 'inline-flex', gap: 14 }}>
          <a href={CALENDLY} target="_blank" rel="noopener" style={btnPrimary}
            onMouseEnter={e => { e.currentTarget.style.background = '#2A2620'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1814'; e.currentTarget.style.transform = 'none' }}>
            Book a demo <span>→</span>
          </a>
          <a href={CALENDLY} target="_blank" rel="noopener" style={btnSecondary}
            onMouseEnter={e => e.currentTarget.style.background = '#ECE5D8'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Start free
          </a>
        </div>
      </div>
    </section>
  )
}
