import { useEffect, useRef, useState } from 'react'
import { animateNumber } from '../hooks/useCountUp'

const SCRIPT = [
  { t: '00:00', txt: 'Fetching listing MLS 88741203 from feed…',                               dur: 900  },
  { t: '00:01', txt: 'Pulling 14 rent comps within 0.8 mi…',                                  dur: 1100 },
  { t: '00:03', txt: 'Tax roll lookup: $6,180/yr · Franklin County assessor.',                 dur: 900  },
  { t: '00:04', txt: 'Quoting insurance against your lender profile… $1,840/yr.',              dur: 900  },
  { t: '00:05', txt: 'Computing PITI @ 6.85% · 30yr fixed · 3.5% down.',                     dur: 1000 },
  { t: '00:06', txt: 'Applying your rules: 8% vacancy, $125/mo repairs, 8% mgmt.',            dur: 1100 },
  { t: '00:07', txt: 'Stress-testing at −10% rent… still cash-flow positive.',                dur: 1000 },
]

const Spinner = () => (
  <svg viewBox="0 0 14 14" fill="none" width="12" height="12" style={{ animation: 'spin 1.2s linear infinite' }}>
    <path d="M7 1 a6 6 0 1 0 4.24 1.76" stroke="#5C564E" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const Check = () => (
  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
    <path d="M2 7 L6 11 L12 3" stroke="#2D5A3D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function AgentCard({ visible }) {
  const [lines, setLines] = useState([])
  const [verdictVisible, setVerdictVisible] = useState(false)
  const [cashValue, setCashValue] = useState('+$0')
  const cashRef = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!visible || hasRun.current) return
    hasRun.current = true

    const timeouts = []
    let acc = 0

    SCRIPT.forEach((step, i) => {
      timeouts.push(setTimeout(() => {
        setLines(prev => {
          // mark previous line done
          const updated = prev.map((l, idx) => idx === prev.length - 1 ? { ...l, done: true } : l)
          const next = [...updated, { id: i, t: step.t, txt: step.txt, done: false }]
          // keep last 5 visible
          return next.slice(-5)
        })
      }, acc))
      acc += step.dur
    })

    // finish last line + show verdict
    timeouts.push(setTimeout(() => {
      setLines(prev => prev.map((l, idx) => idx === prev.length - 1 ? { ...l, done: true } : l))
      setVerdictVisible(true)
      if (cashRef.current) {
        animateNumber(cashRef.current, 0, 412, 1200, v => `+$${Math.round(v).toLocaleString()}`)
      }
    }, acc + 200))

    return () => timeouts.forEach(clearTimeout)
  }, [visible])

  return (
    <div style={{
      background: '#F3EEE4', border: '1px solid rgba(26,24,20,0.08)',
      padding: 28, display: 'flex', flexDirection: 'column', minHeight: 520,
      opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(10px)',
      transition: 'opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)',
    }}>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(26,24,20,0.08)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5C564E', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        <span>AGENT / UNDERWRITE.RUN</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2D5A3D' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2D5A3D', boxShadow: '0 0 0 0 rgba(45,90,61,0.55)', animation: 'pulse 1.8s infinite', display: 'inline-block' }} />
          LIVE
        </span>
      </div>

      {/* subject */}
      <div style={{ padding: '20px 0 16px', borderBottom: '1px solid rgba(26,24,20,0.08)', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 56, height: 56, flexShrink: 0, background: '#ECE5D8', border: '1px solid rgba(26,24,20,0.08)', backgroundImage: 'linear-gradient(135deg,transparent 48%,rgba(26,24,20,0.16) 48%,rgba(26,24,20,0.16) 52%,transparent 52%),linear-gradient(45deg,transparent 48%,rgba(26,24,20,0.16) 48%,rgba(26,24,20,0.16) 52%,transparent 52%)', backgroundSize: '8px 8px' }} />
        <div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, fontWeight: 600, lineHeight: 1.25 }}>318 Maple Ave · 2-flat</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#5C564E', marginTop: 2 }}>
            <span style={{ color: '#1A1814' }}>$489,000</span> · Columbus, OH · MLS 88741203
          </div>
        </div>
      </div>

      {/* stream — pure React state, no DOM manipulation */}
      <div style={{ padding: '20px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lines.map((line, i) => (
          <div key={line.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 13, lineHeight: 1.5, opacity: 1, transition: 'opacity 360ms' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9288', flexShrink: 0, width: 44 }}>{line.t}</span>
            <span style={{ flexShrink: 0, width: 14, height: 14, marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {line.done ? <Check /> : <Spinner />}
            </span>
            <span style={{ color: '#1A1814', flex: 1 }}>{line.txt}</span>
          </div>
        ))}
      </div>

      {/* verdict */}
      <div style={{
        borderTop: '1px solid rgba(26,24,20,0.08)', paddingTop: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: verdictVisible ? 1 : 0, transform: verdictVisible ? 'none' : 'translateY(6px)',
        transition: 'opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5C564E', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Projected monthly cash flow</div>
          <div ref={cashRef} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 500, color: '#2D5A3D', letterSpacing: '-0.01em' }}>+$0</div>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 500, color: '#2D5A3D', background: '#E8EFE8', padding: '6px 12px' }}>DEAL WORKS</span>
      </div>
    </div>
  )
}
