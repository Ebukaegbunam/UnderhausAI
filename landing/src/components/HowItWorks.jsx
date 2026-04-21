const STEPS = [
  {
    n: 'STEP 01',
    title: ['Tell us the ', 'rules you buy by', '.'],
    desc: 'Your budget, down payment, target markets, cash-flow floor, and the assumptions you use for vacancy, repairs, and management. Five minutes, not a spreadsheet.',
    rows: [
      ['max_purchase', '$725,000'],
      ['down_payment', '3.5% FHA'],
      ['min_cash_flow', '+$200/mo'],
      ['markets', 'COL · ATL · PHX'],
      ['vacancy', '8%'],
    ],
  },
  {
    n: 'STEP 02',
    title: ['The agent ', 'watches the MLS', ' for you.'],
    desc: 'Every new listing that fits your profile goes through the same underwriting pass: rent comps, tax roll, PITI, insurance, reserve — all cited, all checkable.',
    rows: [
      ['new_listing', '318 Maple Ave'],
      ['pulling_comps', '14 within 0.8mi'],
      ['tax_roll', '$6,180/yr'],
      ['piti', '$3,248/mo'],
      ['verdict', '+$412/mo', true],
    ],
  },
  {
    n: 'STEP 03',
    title: ['You only see the ones that ', 'actually work', '.'],
    desc: 'A ranked feed of deals that clear your floor, with the full underwriting attached. Tour the ones that already passed the math — not the other way around.',
    rows: [
      ['318 Maple Ave', '+$412', true],
      ['74 Sycamore Dr', '+$288', true],
      ['902 Birch St', '+$201', true],
      ['1204 Oak Blvd', '−$88', false, true],
      ['…+ 6 more today', ''],
    ],
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-[clamp(80px,14vh,160px)]">
      <div className="max-w-[1280px] mx-auto px-8 relative z-[2]">
        <div className="flex items-baseline gap-4 mb-12 pb-5 border-b border-[rgba(26,24,20,0.08)]">
          <span className="text-xs font-medium tracking-widest uppercase text-[#5C564E] flex items-center">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1A1814] mr-2.5" />How it works
          </span>
          <span className="font-mono text-[11px] text-[#9A9288] tracking-wider">02 / 04</span>
        </div>

        <h2 className="reveal font-['Instrument_Serif'] text-[clamp(40px,5vw,64px)] leading-[1.04] tracking-[-0.01em] max-w-[820px] mb-16">
          Three steps, then the AI does the <em className="italic">rest of the week</em> for you.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[rgba(26,24,20,0.08)] border border-[rgba(26,24,20,0.08)]">
          {STEPS.map(({ n, title, desc, rows }) => (
            <div key={n} className="fade-up bg-[#FAF7F2] p-10 pb-12 flex flex-col min-h-[380px] hover:bg-[#F3EEE4] transition-colors">
              <div className="font-mono text-[11px] text-[#9A9288] tracking-widest mb-8">{n}</div>
              <h3 className="font-['Instrument_Serif'] text-[26px] leading-[1.25] tracking-[-0.005em] mb-4">
                {title[0]}<em className="italic text-[#1A1814]">{title[1]}</em>{title[2]}
              </h3>
              <p className="text-[15px] text-[#5C564E] leading-relaxed max-w-[38ch] mb-6">{desc}</p>
              <div className="mt-auto border border-[rgba(26,24,20,0.08)] bg-[#F3EEE4] min-h-[140px] p-3.5 flex flex-col font-mono text-[11px] text-[#5C564E] gap-2 overflow-hidden">
                {rows.map(([k, v, green, red]) => (
                  <div key={k} className="flex justify-between items-center py-1 border-b border-dashed border-[rgba(26,24,20,0.08)] last:border-0">
                    <span className="text-[#9A9288]">{k}</span>
                    <span style={{ color: green ? '#2D5A3D' : red ? '#B84A2E' : '#1A1814' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
