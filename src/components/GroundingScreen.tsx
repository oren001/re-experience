import { useEffect, useState } from 'react'

interface Props {
  onContinue: () => void
}

export function GroundingScreen({ onContinue }: Props) {
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowButton(true), 2800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: '#030409',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      gap: 14,
      animation: 'ground-fade 1.2s ease both',
    }}>
      <style>{`
        @keyframes ground-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ground-line { from { width: 0 } to { width: 48px } }
        .ground-continue:hover { color: rgba(255,255,255,0.6) !important; border-color: rgba(255,255,255,0.2) !important; }
      `}</style>

      {/* Divider line — animates in after a beat */}
      <div style={{
        height: '1px',
        background: 'rgba(255,255,255,0.1)',
        width: 48,
        marginBottom: 18,
        animation: 'ground-line 1.4s cubic-bezier(0.22,1,0.36,1) 0.6s both',
      }} />

      <p style={{
        margin: 0,
        fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
        fontWeight: 100, letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.5)',
        animation: 'ground-fade 1.2s ease 0.4s both',
      }}>
        You've returned.
      </p>

      <p style={{
        margin: 0, fontSize: '12px',
        letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)',
        animation: 'ground-fade 1s ease 1.2s both',
      }}>
        Take a moment. You're here.
      </p>

      <button
        className="ground-continue"
        onClick={onContinue}
        style={{
          marginTop: 36,
          padding: '11px 38px', borderRadius: '100px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.28)',
          fontSize: '12px', letterSpacing: '0.14em',
          cursor: 'pointer',
          opacity: showButton ? 1 : 0,
          transition: 'opacity 0.8s ease, color 0.2s, border-color 0.2s',
        }}
      >
        Continue
      </button>
    </div>
  )
}
