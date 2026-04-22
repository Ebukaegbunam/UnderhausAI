import { useState, useEffect } from 'react'

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://app.underhausai.com'
const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center',
        transition: 'background 360ms, border-color 360ms',
        borderBottom: (scrolled || menuOpen) ? '1px solid rgba(26,24,20,0.08)' : '1px solid transparent',
        background: (scrolled || menuOpen) ? 'rgba(250,247,242,0.98)' : 'transparent',
        backdropFilter: scrolled && !menuOpen ? 'blur(14px)' : 'none',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

          <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1A1814', textDecoration: 'none', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 10 L12 2 L21 10 L21 22 L3 22 Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
              <line x1="3" y1="14.5" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.75"/>
            </svg>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, letterSpacing: '-0.015em' }}>Underhaus</span>
          </a>

          {/* Desktop center nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 36 }}>
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

          {/* Desktop right auth */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 20 }}>
            <a href={`${APP_URL}/login`} style={{ fontSize: 14, color: '#5C564E', textDecoration: 'none', transition: 'color 200ms' }}
              onMouseEnter={e => e.target.style.color = '#1A1814'}
              onMouseLeave={e => e.target.style.color = '#5C564E'}>
              Sign in
            </a>
            <a href={`${APP_URL}/login`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#1A1814', color: '#FAF7F2', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms, transform 200ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2A2620'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1A1814'; e.currentTarget.style.transform = 'none' }}>
              Get started <span>→</span>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#1A1814', lineHeight: 0 }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed', inset: 0, zIndex: 49, background: '#FAF7F2',
            paddingTop: 72, display: 'flex', flexDirection: 'column',
            animation: 'fadeIn 180ms ease both',
          }}
        >
          <nav style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
            {[['#how', 'How it works'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} onClick={closeMenu}
                style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: '#1A1814', textDecoration: 'none', padding: '18px 0', borderBottom: '1px solid rgba(26,24,20,0.08)', display: 'block' }}>
                {label}
              </a>
            ))}
            <a href={CALENDLY} target="_blank" rel="noopener" onClick={closeMenu}
              style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: '#1A1814', textDecoration: 'none', padding: '18px 0', borderBottom: '1px solid rgba(26,24,20,0.08)', display: 'block' }}>
              Book a demo →
            </a>
          </nav>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(26,24,20,0.08)' }}>
            <a href={`${APP_URL}/login`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', border: '1px solid rgba(26,24,20,0.18)', fontSize: 15, fontWeight: 500, color: '#1A1814', textDecoration: 'none' }}>
              Sign in
            </a>
            <a href={`${APP_URL}/login`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: '#1A1814', color: '#FAF7F2', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
              Get started →
            </a>
          </div>
        </div>
      )}
    </>
  )
}
