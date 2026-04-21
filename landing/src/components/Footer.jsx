const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'

const COLS = [
  { title: 'Product', links: ['How it works', 'Pricing', 'Methodology', 'Markets covered'] },
  { title: 'Company', links: ['About', 'Blog', 'Changelog', 'Careers'] },
  { title: 'Legal',   links: ['Privacy', 'Terms', 'Data sources', 'Contact'] },
]

const NAV_HREFS = { 'How it works': '#how', 'Pricing': '#pricing' }

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(26,24,20,0.08)] pt-[72px] pb-10 relative z-[2]" style={{ background: '#F3EEE4' }}>
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          <div>
            <a href="#top" className="flex items-center gap-2.5" style={{ color: '#1A1814', textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 10 L12 2 L21 10 L21 22 L3 22 Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
                <line x1="3" y1="14.5" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.75"/>
              </svg>
              <span className="font-['Instrument_Serif'] text-2xl tracking-tight">Underhaus</span>
            </a>
            <p className="font-['Instrument_Serif'] text-lg leading-[1.4] max-w-[28ch] mt-4" style={{ color: '#5C564E' }}>
              AI underwriting for the person buying their first small multi — and the one buying their fourth.
            </p>
          </div>
          {COLS.map(({ title, links }) => (
            <div key={title}>
              <h5 className="font-sans font-medium text-xs tracking-widest uppercase text-[#9A9288] mb-4">{title}</h5>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {links.map(link => (
                  <li key={link}>
                    <a
                      href={NAV_HREFS[link] || CALENDLY}
                      target={NAV_HREFS[link] ? undefined : '_blank'}
                      rel={NAV_HREFS[link] ? undefined : 'noopener'}
                      style={{ fontSize: 14, color: '#5C564E', textDecoration: 'none', transition: 'color 200ms' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#1A1814'}
                      onMouseLeave={e => e.currentTarget.style.color = '#5C564E'}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-[72px] pt-7 border-t border-[rgba(26,24,20,0.08)] flex justify-between items-center font-mono text-[11px] text-[#9A9288] tracking-wider">
          <span>© 2026 UNDERHAUS LABS, INC.</span>
          <span>BUILT FOR THE US MARKET · SHIPPED FROM EVERYWHERE</span>
        </div>
      </div>
    </footer>
  )
}
