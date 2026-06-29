// apps/web/src/components/FlyingCardOverlay.tsx
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'
import { FlyingCard } from './FlyingCard'

export function FlyingCardOverlay() {
  const flyingCards = useBattleStore(s => s.flyingCards)
  return createPortal(
    <>
      {flyingCards.map(fc => (
        <FlyingCard key={fc.id} animation={fc} />
      ))}
    </>,
    document.body,
  )
}