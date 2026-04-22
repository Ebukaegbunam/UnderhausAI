import { useEffect, useRef, useState } from 'react'
import { animateNumber } from '../hooks/useCountUp'
import AgentCard from './AgentCard'

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://app.underhausai.com'
const CALENDLY = 'https://calendly.com/ebukaegb1/underhaus-ai'
const WORDS = ['An ', 'AI ', 'that ', 'underwrites ', 'every', null, 'listing ', 'before ', 'you ', 'tour.']

export default function Hero() {
  const [wordStates, setWordStates] = useState(WORDS.map(() => false))
  const [subIn, setSubIn] = useState(false)
  const [ctasIn, setCtasIn] = useState(false)
  const [trustIn, setTrustIn] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const countRefs = useRef([])
  const played = useRef(false)

  useEffect(() => {
    if (played.current) return
    played.current = true

    WORDS.forEach((_, i) => {
      setTimeout(() => {
        setWordStates(prev => { const n = [...prev]; n[i] = true; return n })
      }, 120 + i * 110)
    })

    const finalT = 120 + (WORDS.length - 1) * 110 + 500
    setTimeout(() => setSubIn(true), finalT)
    setTimeout(() => setCtasIn(true), finalT + 160)
    setTimeout(() => setTrustIn(true), finalT + 360)
    setTimeout(() => setCardVisible(true), finalT + 200)

    setTimeout(() => {
      countRefs.current.forEach(el => {
        if (!el) return
        const target = parseFloat(el.dataset.target)
        const isFloat = String(target).includes('.')
        animateNumber(el, 0, target, 1100, v => isFloat ? v.toFixed(1) : Math.round(v).toLocaleString())
      })
    }, finalT + 500)
  }, [])

  return (
    <section id="top" className="min-h-screen flex flex-col justify-center pt-28 md:pt-[184px] pb-20 relative">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 relative z-[2] w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-20 items-center">

          {/* left */}
          <div>
            <div className="flex items-center gap-4 mb-8 md:mb-10 font-mono text-[11px] text-[#9A9288] tracking-wider">
              <span>UNDERHAUS / AI UNDERWRITING</span>
              <span className="w-6 h-px bg-[rgba(26,24,20,0.16)]" />
              <span className="hidden sm:inline">v0.9 — ALL US MARKETS</span>
            </div>

            <h1 className="font-['Instrument_Serif'] text-[clamp(38px,8vw,116px)] leading-[0.98] tracking-[-0.015em] mb-7 md:mb-8" aria-label="An AI that underwrites every listing before you tour.">
              {WORDS.map((word, i) => {
                if (word === null) return <span key={i} className="block h-0" />
                const isItalic = i === 3
                return (
                  <span key={i} className={`word-hidden ${wordStates[i] ? 'word-in' : ''} ${isItalic ? 'italic' : ''}`}>
                    {word}
                  </span>
                )
              })}
            </h1>

            <p className={`max-w-[560px] text-lg md:text-xl leading-relaxed text-[#5C564E] mb-8 md:mb-10 transition-all duration-700 ${subIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              Point Underhaus at your budget, your target markets, and the rules of thumb you actually use. It runs the rent comps, pulls the taxes, computes PITI, and hands you the deals that cash flow. No spreadsheets. No maybe.
            </p>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', transition: 'opacity 700ms, transform 700ms', transitionDelay: '120ms', opacity: ctasIn ? 1 : 0, transform: ctasIn ? 'none' : 'translateY(8px)' }}>
              <a href={`${APP_URL}/login`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: '#1A1814', color: '#FAF7F2', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'background 200ms, transform 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2A2620'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1A1814'; e.currentTarget.style.transform = 'none' }}>
                Get pre-underwritten deals <span>→</span>
              </a>
              <a href={CALENDLY} target="_blank" rel="noopener"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 0', fontSize: 14, color: '#1A1814', textDecoration: 'none', transition: 'color 200ms' }}
                onMouseEnter={e => e.currentTarget.style.color = '#5C564E'}
                onMouseLeave={e => e.currentTarget.style.color = '#1A1814'}>
                Book a call <span>↓</span>
              </a>
            </div>

            {/* trust bar */}
            <div className={`mt-14 md:mt-[72px] flex flex-wrap items-start gap-5 md:gap-7 pt-7 border-t border-[rgba(26,24,20,0.08)] transition-opacity duration-700 delay-300 ${trustIn ? 'opacity-100' : 'opacity-0'}`}>
              <span className="font-mono text-[11px] text-[#9A9288] tracking-widest uppercase whitespace-nowrap pt-0.5">Underwriting to date</span>
              <div className="flex flex-wrap gap-6 md:gap-10">
                {[
                  { target: '48219', label: 'Listings analyzed', fmt: v => Math.round(v).toLocaleString() },
                  { target: '3.4', label: 'Gross value priced', prefix: '$', suffix: 'B' },
                  { target: '14', label: 'Live, more coming', suffix: ' markets' },
                ].map(({ target, label, prefix = '', suffix = '' }, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="font-mono text-lg font-medium text-[#1A1814]">
                      {prefix}<span ref={el => countRefs.current[i] = el} data-target={target}>0</span>{suffix}
                    </span>
                    <span className="text-xs text-[#5C564E]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* right — agent card */}
          <div className="mt-4 lg:mt-0">
            <AgentCard visible={cardVisible} />
          </div>
        </div>
      </div>
    </section>
  )
}
