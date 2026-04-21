const LEFT = [
  'Estimated value, sourced from nothing in particular.',
  '"Great for house hackers" — no numbers behind it.',
  'A mortgage calculator with the taxes missing.',
  'Rent estimates ± 35%.',
]
const RIGHT = [
  'Rent comps pulled from 14 units within 0.8 miles.',
  'PITI computed against your actual pre-approval.',
  'Cash flow after 8% vacancy, capex reserve, and mgmt.',
  'A signed number. Plus or minus. No hedging.',
]

export default function Contrast() {
  return (
    <section id="contrast" className="py-20 border-t border-b border-[rgba(26,24,20,0.08)]">
      <div className="max-w-[1280px] mx-auto px-8 relative z-[2]">
        <div className="flex items-baseline gap-4 mb-12 pb-5 border-b border-[rgba(26,24,20,0.08)]">
          <span className="text-xs font-medium tracking-widest uppercase text-[#5C564E] flex items-center">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1A1814] mr-2.5" />The gap
          </span>
          <span className="font-mono text-[11px] text-[#9A9288] tracking-wider">01 / 04</span>
        </div>

        <h2 className="reveal font-['Instrument_Serif'] text-[clamp(40px,5vw,64px)] leading-[1.04] tracking-[-0.01em] max-w-[800px] mb-12">
          Listing sites show you <em className="italic">kitchens</em>. Underhaus shows you the <em className="italic">math</em>.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-9 border-r border-[rgba(26,24,20,0.08)]">
            <div className="font-mono text-[11px] tracking-widest uppercase text-[#9A9288] mb-4">What the portals tell you</div>
            <ul className="list-none p-0 m-0">
              {LEFT.map((item, i) => (
                <li key={i} className="font-['Instrument_Serif'] text-[22px] font-medium leading-[1.4] py-4 border-b border-[rgba(26,24,20,0.08)] last:border-0 text-[#5C564E] flex items-baseline gap-3.5">
                  <span className="font-mono text-[13px] text-[#9A9288] shrink-0 w-5">0{i+1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-9" style={{ background: '#F3EEE4' }}>
            <div className="font-mono text-[11px] tracking-widest uppercase text-[#9A9288] mb-4">What Underhaus tells you</div>
            <ul className="list-none p-0 m-0">
              {RIGHT.map((item, i) => (
                <li key={i} className="font-['Instrument_Serif'] text-[22px] font-medium leading-[1.4] py-4 border-b border-[rgba(26,24,20,0.08)] last:border-0 flex items-baseline gap-3.5" style={{ color: '#1A1814' }}>
                  <span className="font-mono text-[13px] shrink-0 w-5" style={{ color: '#1A1814' }}>0{i+1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
