import { useSceneStore } from '@/store/sceneStore'
import type { WeatherMood } from '@/types/scene.types'

const MOODS: { id: WeatherMood; label: string; emoji: string }[] = [
  { id: 'clear', label: 'Clear', emoji: '☀️' },
  { id: 'overcast', label: 'Overcast', emoji: '☁️' },
  { id: 'foggy', label: 'Foggy', emoji: '🌫️' },
  { id: 'stormy', label: 'Stormy', emoji: '⛈️' },
]

export function EnvironmentPanel() {
  const env = useSceneStore((s) => s.environment)
  const setEnvironment = useSceneStore((s) => s.setEnvironment)

  const hourLabel = (h: number) => {
    const suffix = h < 12 ? 'AM' : 'PM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display}:00 ${suffix}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs text-white/40 uppercase tracking-wider">Time of Day</span>
          <span className="text-xs text-white/60">{hourLabel(env.timeOfDay)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={23}
          step={1}
          value={env.timeOfDay}
          onChange={(e) => setEnvironment({ timeOfDay: parseInt(e.target.value) })}
          className="w-full accent-sky-400"
        />
        <div className="flex justify-between text-xs text-white/25 mt-0.5">
          <span>Midnight</span>
          <span>Noon</span>
          <span>Night</span>
        </div>
      </div>

      <div>
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Weather Mood</div>
        <div className="grid grid-cols-2 gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setEnvironment({ weatherMood: m.id })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                env.weatherMood === m.id
                  ? 'border-sky-400 bg-sky-900/50 text-sky-200'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs text-white/40 uppercase tracking-wider">Brightness</span>
          <span className="text-xs text-white/60">{Math.round(env.ambientIntensity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={env.ambientIntensity}
          onChange={(e) => setEnvironment({ ambientIntensity: parseFloat(e.target.value) })}
          className="w-full accent-sky-400"
        />
      </div>
    </div>
  )
}
