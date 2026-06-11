import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#403D3D',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Emerald accent bar left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#10B981',
          }}
        />

        {/* Building skyline (right side) */}
        <div
          style={{
            position: 'absolute',
            right: 80,
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            opacity: 0.15,
          }}
        >
          {[120, 180, 260, 200, 140, 100].map((h, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: h,
                background: '#10B981',
                borderRadius: '4px 4px 0 0',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            paddingLeft: 80,
            paddingRight: 80,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div
              style={{
                width: 60,
                height: 60,
                background: '#10B981',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 800,
                color: 'white',
              }}
            >
              SQ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                Sequoia Projects Ltd
              </span>
              <span style={{ color: '#10B981', fontSize: 14, fontWeight: 500, letterSpacing: 2 }}>
                REAL ESTATE · ABUJA
              </span>
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.1,
              maxWidth: 700,
            }}
          >
            Premier Real Estate Services in Abuja
          </div>

          {/* Subline */}
          <div
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 20,
              maxWidth: 600,
              lineHeight: 1.4,
            }}
          >
            Property management, construction, consultancy & short-let. Since 2017.
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
            {['Property Management', 'Construction', 'Short-Let', '200+ Clients'].map((tag) => (
              <div
                key={tag}
                style={{
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  color: '#10B981',
                  padding: '8px 18px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
