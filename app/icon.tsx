import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#403D3D',
          borderRadius: 6,
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
            gap: 1,
            marginBottom: 1,
          }}
        >
          <div style={{ width: 4, height: 8, background: '#10B981', borderRadius: '1px 1px 0 0' }} />
          <div style={{ width: 5, height: 12, background: '#10B981', borderRadius: '1px 1px 0 0' }} />
          <div style={{ width: 4, height: 9, background: '#10B981', borderRadius: '1px 1px 0 0' }} />
        </div>
        {/* Ground line */}
        <div style={{ width: 18, height: 1, background: '#10B981', opacity: 0.7 }} />
        {/* S letter */}
        <div
          style={{
            fontSize: 8,
            fontWeight: 800,
            color: 'white',
            lineHeight: 1,
            marginTop: 2,
            letterSpacing: '-0.5px',
          }}
        >
          SQ
        </div>
      </div>
    ),
    { ...size }
  )
}
