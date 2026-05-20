import { useEffect, useState } from 'react'

interface Props {
  sceneName: string
  onEnter: () => void
  onBack:  () => void
}

function getPersonName(): string | null {
  try {
    const n = localStorage.getItem('re-exp-person-name')
    return n && n !== 'the person in this memory' ? n : null
  } catch { return null }
}

function getApiKeySet(): boolean {
  try { return !!localStorage.getItem('re-exp-api-key') } catch { return false }
}

export function PreparationScreen({ sceneName, onEnter, onBack }: Props) {
  const [phase, setPhase]           = useState(0)  // 0→name only, 1→breath+person, 2→button
  const [nameInput, setNameInput]   = useState('')
  const [showSetup, setShowSetup]   = useState(false)
  const personName = getPersonName()
  const hasVoice   = getApiKeySet() && !!personName

  // Strip fileName extension for display
  const displayName = sceneName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1600)
    const t2 = setTimeout(() => setPhase(2), 4200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const saveAndEnter = () => {
    if (nameInput.trim()) {
      try { localStorage.setItem('re-exp-person-name', nameInput.trim()) } catch {}
    }
    onEnter()
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'radial-gradient(ellipse at 50% 35%, #0c1828 0%, #030409 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <style>{`
        @keyframes prep-breathe {
          0%,100% { transform: scale(0.82); opacity: 0.14 }
          50%      { transform: scale(1.28); opacity: 0.48 }
        }
        @keyframes prep-up {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .prep-enter-btn:hover {
          background: rgba(120,160,255,0.14) !important;
          border-color: rgba(160,200,255,0.45) !important;
          color: rgba(220,235,255,0.95) !important;
        }
      `}</style>

      {/* Back */}
      <button onClick={onBack} style={{
        position: 'absolute', top: 24, left: 24,
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.2)', fontSize: '12px',
        letterSpacing: '0.08em', cursor: 'pointer',
        transition: 'color 0.2s',
      }}>
        ← Back
      </button>

      {/* Breathing orb */}
      <div style={{
        width: 160, height: 160, borderRadius: '50%', flexShrink: 0,
        background: 'radial-gradient(circle, rgba(100,150,255,0.28) 0%, rgba(60,90,200,0.1) 55%, transparent 78%)',
        animation: phase >= 1 ? 'prep-breathe 6s ease-in-out infinite' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 2s ease',
        marginBottom: 52,
      }} />

      {/* Scene name */}
      <h1 style={{
        margin: 0,
        fontSize: 'clamp(1.9rem, 4.5vw, 3.2rem)',
        fontWeight: 100, letterSpacing: '0.03em', lineHeight: 1.1,
        color: 'rgba(255,255,255,0.88)',
        textAlign: 'center', padding: '0 32px',
        animation: 'prep-up 1.2s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {displayName}
      </h1>

      {/* Person / context */}
      <div style={{
        marginTop: 20, textAlign: 'center',
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 1.4s ease, transform 1.4s ease',
      }}>
        {showSetup ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            animation: 'prep-up 0.5s ease both',
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
              Who is in this memory?
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveAndEnter()}
              style={{
                padding: '10px 18px', borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.85)', fontSize: '14px',
                outline: 'none', textAlign: 'center', letterSpacing: '0.05em',
                fontFamily: 'inherit', width: 200,
              }}
            />
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
              To speak with them, add your API key in ⚙ once inside.
            </p>
          </div>
        ) : personName ? (
          <>
            <p style={{ margin: 0, fontSize: '15px', letterSpacing: '0.1em', color: 'rgba(180,210,255,0.6)' }}>
              {personName} is here with you.
            </p>
            {hasVoice && (
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
                Press V inside to speak with them.
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: '14px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)' }}>
              Take a breath before you enter.
            </p>
            <button
              onClick={() => setShowSetup(true)}
              style={{
                marginTop: 12, background: 'none', border: 'none',
                color: 'rgba(120,160,255,0.5)', fontSize: '11px',
                letterSpacing: '0.1em', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
                transition: 'color 0.2s',
              }}
            >
              + Who's in this memory?
            </button>
          </>
        )}
      </div>

      {/* Enter button */}
      <button
        className="prep-enter-btn"
        onClick={showSetup ? saveAndEnter : onEnter}
        style={{
          marginTop: 56,
          padding: '15px 52px', borderRadius: '100px',
          border: '1px solid rgba(120,160,255,0.22)',
          background: 'rgba(90,120,220,0.08)',
          color: 'rgba(190,215,255,0.75)',
          fontSize: '13px', letterSpacing: '0.2em',
          cursor: 'pointer',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease, background 0.25s, border-color 0.25s, color 0.25s',
          backdropFilter: 'blur(8px)',
        }}
      >
        {showSetup ? 'Continue →' : 'Enter'}
      </button>
    </div>
  )
}
