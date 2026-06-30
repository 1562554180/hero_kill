import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'

export function DamageFloaterOverlay() {
  const floaters = useBattleStore(s => s.damageFloaters)
  const remove = useBattleStore(s => s.removeFloater)
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
  entry: { id: string; heroId: string; amount: number; type: 'damage' | 'heal' }
  onDone: () => void
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = document.querySelector(`[data-hero-id="${entry.heroId}"]`) as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [entry.heroId])

  if (!pos) return null
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
