import { useState, useEffect } from 'react'
import { api } from './api/client'

export default function App() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    api.get('/').then(setStatus).catch(() => setStatus({ error: 'Backend offline' }))
  }, [])

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-stone-900 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold tracking-tight">UnderhausAI</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="card">
          <p className="section-label">Welcome</p>
          <p className="text-stone-700 text-lg font-medium">UnderhausAI is up and running.</p>
          <p className="text-stone-500 mt-2 text-sm">More features coming soon.</p>

          <div className="mt-6 pt-4 border-t border-stone-100">
            <p className="field-label">Backend status</p>
            {status === null && <p className="text-stone-400 text-sm">Checking...</p>}
            {status?.error && <p className="negative text-sm">{status.error}</p>}
            {status?.status === 'ok' && <p className="positive text-sm">Connected</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
