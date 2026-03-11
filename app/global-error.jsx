'use client'

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0, background: '#080808' }}>
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
            <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>
              {error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '8px 16px', fontSize: 14, color: '#fff',
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
