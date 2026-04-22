import { useState } from 'react'

const INCOME_OPTIONS = [
  { label: 'Prefer not to say', value: '' },
  { label: 'Under $30,000', value: 30000 },
  { label: '$30,000 – $50,000', value: 50000 },
  { label: '$50,000 – $75,000', value: 75000 },
  { label: '$75,000 – $100,000', value: 100000 },
  { label: '$100,000 – $125,000', value: 125000 },
  { label: '$125,000 – $150,000', value: 150000 },
  { label: '$150,000 – $200,000', value: 200000 },
  { label: '$200,000 – $300,000', value: 250000 },
  { label: '$300,000+', value: 300000 },
]

const DOWN_OPTIONS = [3.5, 5, 10, 15, 20, 25, 30, 35, 40]
const DEBT_OPTIONS = [0, 200, 500, 750, 1000, 1500, 2000, 2500, 3000]
const COC_OPTIONS = [4, 6, 8, 10, 12, 15, 20]
const VACANCY_OPTIONS = [0, 3, 5, 8, 10, 12, 15]
const MGMT_OPTIONS = [0, 5, 8, 10, 12, 15]

const CREDIT_OPTIONS = [
  { label: 'Excellent (760+)', value: '760+' },
  { label: 'Good (720–759)', value: '720-759' },
  { label: 'Fair (680–719)', value: '680-719' },
  { label: 'Below Fair (<680)', value: 'below_680' },
]

const GOAL_OPTIONS = [
  { label: 'Buy & Hold', value: 'buy_and_hold' },
  { label: 'House Hack', value: 'house_hack' },
  { label: 'Short-Term Rental', value: 'short_term_rental' },
]

const sel = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  background: '#FAF7F2',
  border: '1px solid rgba(26,24,20,0.12)',
  borderRadius: 6,
  color: '#1A1814',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9288' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
  cursor: 'pointer',
  outline: 'none',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: '#9A9288', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</p>
      {children}
    </div>
  )
}

export default function ProfilePanel({ user, profile, onChange, onSave, saved }) {
  const [advanced, setAdvanced] = useState(false)

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      borderRight: '1px solid rgba(26,24,20,0.08)',
      height: '100%',
      overflowY: 'auto',
    }}>

      {/* User card */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(26,24,20,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt={user.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(26,24,20,0.1)', flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A1814', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#FAF7F2', fontSize: 16, fontFamily: "'Instrument Serif', serif" }}>
                  {(user?.name || user?.email || '?')[0].toUpperCase()}
                </span>
              </div>
          }
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Investor'}</p>
            <p style={{ fontSize: 12, color: '#9A9288', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Investor profile */}
      <div style={{ padding: '20px', flex: 1 }}>
        <p style={{ fontSize: 11, color: '#9A9288', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Investor Profile</p>

        <Field label="Annual Income">
          <select style={sel} value={profile.annual_income ?? ''} onChange={e => onChange('annual_income', e.target.value ? Number(e.target.value) : null)}>
            {INCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Down Payment">
          <select style={sel} value={profile.down_payment_pct} onChange={e => onChange('down_payment_pct', Number(e.target.value))}>
            {DOWN_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </Field>

        <Field label="Credit Score">
          <select style={sel} value={profile.credit_range} onChange={e => onChange('credit_range', e.target.value)}>
            {CREDIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Investment Goal">
          <select style={sel} value={profile.investment_goal} onChange={e => onChange('investment_goal', e.target.value)}>
            {GOAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Monthly Debt Payments">
          <select style={sel} value={profile.monthly_debt_payments} onChange={e => onChange('monthly_debt_payments', Number(e.target.value))}>
            {DEBT_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? 'None' : `$${v.toLocaleString()}/mo`}</option>)}
          </select>
        </Field>

        <Field label="Target Cash-on-Cash">
          <select style={sel} value={profile.target_cash_on_cash_pct} onChange={e => onChange('target_cash_on_cash_pct', Number(e.target.value))}>
            {COC_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </Field>

        {/* Advanced toggle */}
        <button
          onClick={() => setAdvanced(a => !a)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9288', fontSize: 12, padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: advanced ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
          Advanced assumptions
        </button>

        {advanced && (
          <div style={{ animation: 'fadeIn 200ms ease both' }}>
            <Field label="Vacancy Rate">
              <select style={sel} value={profile.vacancy_rate_pct} onChange={e => onChange('vacancy_rate_pct', Number(e.target.value))}>
                {VACANCY_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </Field>
            <Field label="Management Fee">
              <select style={sel} value={profile.management_fee_pct} onChange={e => onChange('management_fee_pct', Number(e.target.value))}>
                {MGMT_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? 'Self-managed' : `${v}%`}</option>)}
              </select>
            </Field>
            <Field label="Maintenance Reserve">
              <select style={sel} value={profile.maintenance_pct} onChange={e => onChange('maintenance_pct', Number(e.target.value))}>
                {[2, 3, 5, 7, 10].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </Field>
            <Field label="CapEx Reserve">
              <select style={sel} value={profile.capex_pct} onChange={e => onChange('capex_pct', Number(e.target.value))}>
                {[2, 3, 5, 7, 10].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </Field>
          </div>
        )}

        <button
          onClick={onSave}
          style={{
            width: '100%',
            padding: '10px 0',
            background: '#1A1814',
            color: '#FAF7F2',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 200ms',
            marginTop: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2A2620'}
          onMouseLeave={e => e.currentTarget.style.background = '#1A1814'}
        >
          {saved ? '✓ Profile Saved' : 'Save Profile'}
        </button>
      </div>
    </aside>
  )
}
