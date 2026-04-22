const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'

const STARTER = [
  'One target market',
  '25 underwritten listings / mo',
  'Rent comps + PITI + cash flow',
  'Email digest, weekly',
  'Export one-page deal memo',
]
const PRO = [
  'Unlimited markets & listings',
  'Real-time alerts on qualifying deals',
  'Custom underwriting rules',
  'Comp notebook — annotate & save',
  'Offer-ready deal memos, on demand',
  'Priority methodology support',
]

export default function Pricing() {
  return (
    <section id="pricing" className="pt-10 pb-[clamp(64px,14vh,160px)]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 relative z-[2]">
        <div className="flex items-baseline gap-4 mb-10 md:mb-12 pb-5 border-b border-[rgba(26,24,20,0.08)]">
          <span className="text-xs font-medium tracking-widest uppercase text-[#5C564E] flex items-center">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1A1814] mr-2.5" />Pricing
          </span>
          <span className="font-mono text-[11px] text-[#9A9288] tracking-wider">03 / 04</span>
        </div>

        <h2 className="reveal font-['Instrument_Serif'] text-[clamp(36px,5vw,64px)] leading-[1.04] tracking-[-0.01em] max-w-[800px] mb-10 md:mb-12">
          Free to watch one market. <em className="italic">Pro</em> when you're actually shopping.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[rgba(26,24,20,0.08)] border border-[rgba(26,24,20,0.08)]">
          {/* starter */}
          <div className="fade-up bg-[#FAF7F2] p-6 md:p-12 flex flex-col">
            <div className="font-mono text-[11px] tracking-widest uppercase text-[#9A9288] mb-7">Starter</div>
            <div className="font-mono text-[48px] md:text-[56px] font-medium tracking-[-0.02em] leading-none mb-2">
              $0<span className="text-base text-[#5C564E] font-normal tracking-normal">/mo</span>
            </div>
            <div className="font-['Instrument_Serif'] text-xl leading-[1.4] text-[#5C564E] mb-7">One market, one saved profile. See what a proper underwriting looks like.</div>
            <ul className="list-none p-0 m-0 mb-8">
              {STARTER.map(item => (
                <li key={item} className="py-3 border-b border-[rgba(26,24,20,0.08)] text-sm flex gap-2.5 items-baseline">
                  <span className="font-mono text-xs text-[#5C564E] w-3">✓</span>{item}
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <a href={CALENDLY} target="_blank" rel="noopener"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 0', border: '1px solid #1A1814', background: 'transparent', color: '#1A1814', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ECE5D8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Start free <span>→</span>
              </a>
            </div>
          </div>

          {/* pro */}
          <div className="fade-up p-6 md:p-12 flex flex-col" style={{ background: '#1A1814', color: '#FAF7F2' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.6)', marginBottom: 28 }}>Pro</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(40px,7vw,56px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>
              $49.99<span style={{ fontSize: 16, color: 'rgba(250,247,242,0.6)', fontWeight: 400, letterSpacing: 0 }}>/mo</span>
            </div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, lineHeight: 1.4, color: 'rgba(250,247,242,0.7)', marginBottom: 28 }}>Unlimited markets, unlimited listings, real-time alerts the moment a deal hits the MLS.</div>
            <ul className="list-none p-0 m-0 mb-8">
              {PRO.map(item => (
                <li key={item} style={{ padding: '12px 0', borderBottom: '1px solid rgba(250,247,242,0.1)', fontSize: 14, display: 'flex', gap: 10, alignItems: 'baseline', color: '#FAF7F2' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(250,247,242,0.6)', width: 12, flexShrink: 0 }}>✓</span>{item}
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <a href={CALENDLY} target="_blank" rel="noopener"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 0', background: '#FAF7F2', color: '#1A1814', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fff'}
                onMouseLeave={e => e.currentTarget.style.background = '#FAF7F2'}>
                Go Pro <span>→</span>
              </a>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-[#9A9288] max-w-[640px]">
          No decoy tiers. No "call sales." Cancel anytime from the same screen you signed up on.
        </p>
      </div>
    </section>
  )
}
