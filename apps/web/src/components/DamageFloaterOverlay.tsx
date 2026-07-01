import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnimationStore } from '../stores/animationStore'

export function DamageFloaterOverlay() {
  const floaters = useAnimationStore(s => s.damageFloaters)
  const remove = useAnimationStore(s => s.removeFloater)
  if (floaters.length === 0) return null
  return createPortal(
    <div data-floater-overlay style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1700 }}>
      {floaters.map(f => (
        <Floater key={f.id} entry={f} onDone={() => remove(f.id)} />
      ))}
    </div>,
    document.body,
  )
}

function Floater({ entry, onDone }: {
  entry: { id: string; heroId: string; amount: number; type: 'damage' | 'heal' | 'dodge' | 'response-kill' }
  onDone: () => void
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = document.querySelector(`[data-hero-id="${entry.heroId}"]`) as HTMLElement | null
    if (el) {
      const r = el.getBoundingClientRect()
      setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
  }, [entry.heroId])

  if (!pos) return null
  if (entry.type === 'dodge') {
    return (
      <div
        className="floater floater-dodge"
        style={{ left: pos.x, top: pos.y - 40 }}
        onAnimationEnd={onDone}
      >🛡️ 闪</div>
    )
  }
  if (entry.type === 'response-kill') {
    return (
      <div
        className="floater floater-response-kill"
        style={{ left: pos.x, top: pos.y - 40 }}
        onAnimationEnd={onDone}
      >🗡️ 杀</div>
    )
  }
  return (
    <div
      className={entry.type === 'heal' ? 'floater floater-heal' : 'floater floater-damage'}
      style={{ left: pos.x, top: pos.y - 40 }}
      onAnimationEnd={onDone}
    >
      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
    </div>
  )
}
