import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#403D3D',
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Building silhouette */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            marginBottom: 4,
          }}
        >
          <div style={{ width: 22, height: 45, background: '#10B981', borderRadius: '4px 4px 0 0' }} />
          <div style={{ width: 28, height: 68, background: '#10B981', borderRadius: '4px 4px 0 0' }} />
          <div style={{ width: 22, height: 52, background: '#10B981', borderRadius: '4px 4px 0 0' }} />
        </div>
        {/* Ground */}
        <div style={{ width: 100, height: 3, background: '#10B981', opacity: 0.7, marginBottom: 8 }} />
        {/* SQ wordmark */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          SQ
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#10B981',
            letterSpacing: 2,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          PROJECTS
        </div>
      </div>
    ),
    { ...size }
  )
}
