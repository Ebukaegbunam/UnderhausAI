import { useState, useEffect } from 'react'

const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 72, zIndex: 50,
      display: 'flex', alignItems: 'center',
      transition: 'background 360ms, border-color 360ms',
      borderBottom: scrolled ? '1px solid rgba(26,24,20,0.08)' : '1px solid transparent',
      background: scrolled ? 'rgba(250,247,242,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 2 }}>

        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1A1814', textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 10 L12 2 L21 10 L21 22 L3 22 Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
            <line x1="3" y1="14.5" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.75"/>
          </svg>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, letterSpacing: '-0.015em' }}>Underhaus</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="nav-links-md">
          {[['#how', 'How it works'], ['#pricing', 'Pricing']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 14, color: '#5C564E', textDecoration: 'none', transition: 'color 200ms' }}
              onMouseEnter={e => e.target.style.color = '#1A1814'}
              onMouseLeave={e => e.target.style.color = '#5C564E'}>
              {label}
            </a>
          ))}
          <a href={CALENDLY} target="_blank" rel="noopener"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#1A1814', color: '#FAF7F2', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms, transform 200ms', border: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2A2620'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1814'; e.currentTarget.style.transform = 'none' }}>
            Book a demo <span>→</span>
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="http://localhost:5175" style={{ fontSize: 14, color: '#5C564E', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = '#1A1814'}
            onMouseLeave={e => e.target.style.color = '#5C564E'}>
            Sign in
          </a>
          <a href="http://localhost:5175/signup"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#1A1814', color: '#FAF7F2', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms, transform 200ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2A2620'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1814'; e.currentTarget.style.transform = 'none' }}>
            Get started <span>→</span>
          </a>
        </div>

      </div>
    </nav>
  )
}
