import { useState } from 'react'

// ── Income: $10k steps up to $200k, then broader ────────────────────────────
const INCOME_OPTIONS = [
  { label: 'Prefer not to say', value: '' },
  ...Array.from({ length: 20 }, (_, i) => {
    const v = (i + 1) * 10000
    return { label: `$${(v / 1000).toFixed(0)}k`, value: v }
  }),
  { label: '$210k', value: 210000 },
  { label: '$220k', value: 220000 },
  { label: '$230k', value: 230000 },
  { label: '$240k', value: 240000 },
  { label: '$250k', value: 250000 },
  { label: '$275k', value: 275000 },
  { label: '$300k', value: 300000 },
  { label: '$350k', value: 350000 },
  { label: '$400k', value: 400000 },
  { label: '$500k+', value: 500000 },
]

// ── Down payment ─────────────────────────────────────────────────────────────
const DOWN_OPTIONS = [
  { label: '3.5%', value: 3.5 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: '25%', value: 25 },
  { label: '30%', value: 30 },
  { label: '35%', value: 35 },
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: 'Cash (100%)', value: 100 },
]

// ── Credit score: numeric by 10s, mapped to backend range in payload ─────────
const CREDIT_OPTIONS = [
  { label: 'Under 580', value: 570 },
  { label: '580', value: 580 },
  { label: '590', value: 590 },
  { label: '600', value: 600 },
  { label: '610', value: 610 },
  { label: '620', value: 620 },
  { label: '630', value: 630 },
  { label: '640', value: 640 },
  { label: '650', value: 650 },
  { label: '660', value: 660 },
  { label: '670', value: 670 },
  { label: '680', value: 680 },
  { label: '690', value: 690 },
  { label: '700', value: 700 },
  { label: '710', value: 710 },
  { label: '720', value: 720 },
  { label: '730', value: 730 },
  { label: '740', value: 740 },
  { label: '750', value: 750 },
  { label: '760', value: 760 },
  { label: '770', value: 770 },
  { label: '780', value: 780 },
  { label: '790', value: 790 },
  { label: '800+', value: 800 },
]

const GOAL_OPTIONS = [
  { label: 'Buy & Hold', value: 'buy_and_hold' },
  { label: 'House Hack', value: 'house_hack' },
  { label: 'Short-Term Rental', value: 'short_term_rental' },
]

const DEBT_OPTIONS = [0, 200, 500, 750, 1000, 1500, 2000, 2500, 3000]
const COC_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 12, 15, 20]
const VACANCY_OPTIONS = [0, 3, 5, 8, 10, 12, 15]
const MGMT_OPTIONS = [0, 5, 8, 10, 12, 15]

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A9288" strokeWidth="2" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
      </svg>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1A1814',
          color: '#FAF7F2',
          fontSize: 11,
          lineHeight: 1.55,
          padding: '7px 10px',
          borderRadius: 6,
          width: 210,
          zIndex: 200,
          pointerEvents: 'none',
          whiteSpace: 'normal',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '5px 5px 0', borderStyle: 'solid', borderColor: '#1A1814 transparent transparent' }} />
        </span>
      )}
    </span>
  )
}

// ── Select style ─────────────────────────────────────────────────────────────
const sel = {
  width: '100%',
  padding: '8px 28px 8px 10px',
  fontSize: 13,
  background: '#FAF7F2',
  border: '1px solid rgba(26,24,20,0.12)',
  borderRadius: 6,
  color: '#1A1814',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9288' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  cursor: 'pointer',
  outline: 'none',
}

// ── Field wrapper with optional tooltip ──────────────────────────────────────
function Field({ label, tooltip, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <p style={{ fontSize: 11, color: '#9A9288', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        {tooltip && <Tip text={tooltip} />}
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfilePanel({ user, profile, onChange, onSave, saved }) {
  const [advanced, setAdvanced] = useState(false)

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
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

        <Field
          label="Annual Income"
          tooltip="Your gross household income before taxes. Used to calculate your debt-to-income ratio and loan eligibility."
        >
          <select style={sel} value={profile.annual_income ?? ''} onChange={e => onChange('annual_income', e.target.value ? Number(e.target.value) : null)}>
            {INCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field
          label="Down Payment"
          tooltip="The upfront cash you put toward the purchase. Higher down payments reduce your loan amount and monthly mortgage costs."
        >
          <select style={sel} value={profile.down_payment_pct} onChange={e => onChange('down_payment_pct', Number(e.target.value))}>
            {DOWN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field
          label="Credit Score"
          tooltip="Your FICO credit score determines your mortgage interest rate. Higher scores get better rates — which directly improves your cash flow."
        >
          <select style={sel} value={profile.credit_score ?? 740} onChange={e => onChange('credit_score', Number(e.target.value))}>
            {CREDIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field
          label="Investment Goal"
          tooltip="How you plan to use the property. House hacking adjusts rent estimates to account for you living in one unit. STR uses short-term rental income projections."
        >
          <select style={sel} value={profile.investment_goal} onChange={e => onChange('investment_goal', e.target.value)}>
            {GOAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field
          label="Monthly Debt Payments"
          tooltip="Your existing monthly obligations — car loans, student loans, credit card minimums. This is used in your debt-to-income ratio to check loan eligibility."
        >
          <select style={sel} value={profile.monthly_debt_payments} onChange={e => onChange('monthly_debt_payments', Number(e.target.value))}>
            {DEBT_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? 'None' : `$${v.toLocaleString()}/mo`}</option>)}
          </select>
        </Field>

        <Field
          label="Target Cash-on-Cash"
          tooltip="The minimum annual return on your invested cash you'll accept. Example: at 8%, every $100k you invest should return $8k/year in cash flow. Deals below this get a NO GO verdict."
        >
          <select style={sel} value={profile.target_cash_on_cash_pct} onChange={e => onChange('target_cash_on_cash_pct', Number(e.target.value))}>
            {COC_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </Field>

        {/* Advanced toggle */}
        <button
          onClick={() => setAdvanced(a => !a)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9288', fontSize: 12, padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: advanced ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
          Advanced assumptions
        </button>

        {advanced && (
          <div style={{ animation: 'fadeIn 200ms ease both' }}>
            <Field
              label="Vacancy Rate"
              tooltip="The % of time the unit sits empty between tenants. Default 8% ≈ about 1 month per year. Higher for competitive markets, lower for tight ones."
            >
              <select style={sel} value={profile.vacancy_rate_pct} onChange={e => onChange('vacancy_rate_pct', Number(e.target.value))}>
                {VACANCY_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </Field>

            <Field
              label="Management Fee"
              tooltip="What a property manager charges, as a % of monthly rent. Set to 0% (Self-managed) if you'll handle it yourself. Typical range is 8–12%."
            >
              <select style={sel} value={profile.management_fee_pct} onChange={e => onChange('management_fee_pct', Number(e.target.value))}>
                {MGMT_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? 'Self-managed (0%)' : `${v}%`}</option>)}
              </select>
            </Field>

            <Field
              label="Maintenance Reserve"
              tooltip="Monthly cash set aside for routine repairs — leaky faucets, appliances, paint. Typically 1–5% of property value per year. Prevents being caught off guard."
            >
              <select style={sel} value={profile.maintenance_pct} onChange={e => onChange('maintenance_pct', Number(e.target.value))}>
                {[1, 2, 3, 5, 7, 10].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </Field>

            <Field
              label="CapEx Reserve"
              tooltip="Capital expenditure reserve — funds for big-ticket replacements like roof, HVAC, water heater, windows. Set aside monthly so you're never caught short."
            >
              <select style={sel} value={profile.capex_pct} onChange={e => onChange('capex_pct', Number(e.target.value))}>
                {[1, 2, 3, 5, 7, 10].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </Field>
          </div>
        )}

        <button
          onClick={onSave}
          style={{
            width: '100%', padding: '10px 0',
            background: '#1A1814', color: '#FAF7F2',
            border: 'none', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'background 200ms', marginTop: 4,
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
