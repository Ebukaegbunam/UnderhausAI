const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'

export default function FinalCTA() {
  return (
    <section id="final" className="py-[clamp(64px,12vh,160px)] border-t border-[rgba(26,24,20,0.08)] text-center relative z-[2]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 relative z-[2]">

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-8">
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5C564E', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1A1814', marginRight: 10 }} />
            Stop reading listings, start reading <em style={{ marginLeft: 4 }}>numbers</em>
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', letterSpacing: '0.04em' }}>04 / 04</span>
        </div>

        <h2 className="reveal font-['Instrument_Serif'] font-semibold text-[clamp(38px,7vw,96px)] leading-[0.98] tracking-[-0.025em] max-w-[900px] mx-auto mb-8 md:mb-10">
          Every listing, <em className="italic font-medium">fully underwritten</em>.<br />Before you ever tour.
        </h2>

        <p className="fade-up text-base md:text-lg text-[#5C564E] max-w-[520px] mx-auto mb-8 md:mb-10">
          Five minutes to set up. The next qualified deal in your inbox could be tomorrow.
        </p>

        <div className="fade-up flex flex-wrap items-center justify-center gap-3">
          <a href={CALENDLY} target="_blank" rel="noopener"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: '#1A1814', color: '#FAF7F2', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms, transform 200ms', border: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2A2620'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1814'; e.currentTarget.style.transform = 'none' }}>
            Book a demo <span>→</span>
          </a>
          <a href={CALENDLY} target="_blank" rel="noopener"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'transparent', color: '#1A1814', fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid #1A1814', transition: 'background 200ms' }}
            onMouseEnter={e => e.currentTarget.style.background = '#ECE5D8'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Start free
          </a>
        </div>
      </div>
    </section>
  )
}
