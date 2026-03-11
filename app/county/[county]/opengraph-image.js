import { ImageResponse } from 'next/og'
import { getCountyOgData } from '@/lib/ogData'

export const runtime = 'edge'
export const alt = 'CalWatch County Card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const interBold = fetch(
  'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiA.woff2'
).then((res) => res.arrayBuffer())

const jetBrainsMono = fetch(
  'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2'
).then((res) => res.arrayBuffer())

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

export default async function OgImage({ params }) {
  const { county } = await params
  const [interFont, monoFont] = await Promise.all([interBold, jetBrainsMono])

  const data = await getCountyOgData(county)

  // Fallback
  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0f',
            fontFamily: 'Inter',
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: '#ffffff' }}>
            CalWatch
          </div>
          <div
            style={{
              fontSize: 20,
              color: '#666',
              marginTop: 12,
              fontFamily: 'JetBrains Mono',
            }}
          >
            County data not found
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: 'Inter', data: interFont, weight: 700 },
          { name: 'JetBrains Mono', data: monoFont, weight: 400 },
        ],
      }
    )
  }

  const isFlagged = data.coiCount > 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0f',
          padding: '48px 56px',
          fontFamily: 'Inter',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontFamily: 'JetBrains Mono',
              color: '#06b6d4',
              letterSpacing: '0.1em',
            }}
          >
            CALWATCH.IO
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'JetBrains Mono',
              letterSpacing: '0.05em',
              padding: '6px 16px',
              borderRadius: 6,
              backgroundColor: isFlagged ? '#450a0a' : '#1a1a2e',
              color: isFlagged ? '#ef4444' : '#666',
              border: `1px solid ${isFlagged ? '#7f1d1d' : '#333'}`,
            }}
          >
            {isFlagged
              ? `${data.coiCount} CONFLICT${data.coiCount !== 1 ? 'S' : ''}`
              : 'NO FLAGS'}
          </div>
        </div>

        {/* Center content */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flex: 1,
          }}
        >
          {/* Left: county info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '55%',
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.15,
              }}
            >
              {data.county} County
            </div>
            <div
              style={{
                fontSize: 16,
                color: '#666',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: 16,
                fontFamily: 'JetBrains Mono',
              }}
            >
              {data.orgCount} ORGANIZATION{data.orgCount !== 1 ? 'S' : ''}{' '}
              FLAGGED
            </div>
          </div>

          {/* Right: amount */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: '#666',
                letterSpacing: '0.1em',
                fontFamily: 'JetBrains Mono',
                marginBottom: 8,
              }}
            >
              TOTAL FLAGGED AMOUNT
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 500,
                fontFamily: 'JetBrains Mono',
                color: isFlagged ? '#ef4444' : '#ffffff',
                lineHeight: 1,
              }}
            >
              {formatCurrency(data.totalAmount)}
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.orgNames.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: '#666',
                    letterSpacing: '0.1em',
                    fontFamily: 'JetBrains Mono',
                    marginBottom: 6,
                  }}
                >
                  FLAGGED ORGANIZATIONS:
                </div>
                <div style={{ fontSize: 18, color: '#ffffff' }}>
                  {data.orgNames.join(', ')}
                </div>
              </>
            )}
          </div>

          <div
            style={{
              fontSize: 14,
              color: '#333',
              fontFamily: 'JetBrains Mono',
            }}
          >
            Data: CA Open FI$Cal + CAL-ACCESS
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interFont, weight: 700 },
        { name: 'JetBrains Mono', data: monoFont, weight: 400 },
      ],
    }
  )
}
