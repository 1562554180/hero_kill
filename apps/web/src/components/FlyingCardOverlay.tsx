// apps/web/src/components/FlyingCardOverlay.tsx
import { createPortal } from 'react-dom'
import { useAnimationStore } from '../stores/animationStore'
import { FlyingCard } from './FlyingCard'

export function FlyingCardOverlay() {
  const flyingCards = useAnimationStore(s => s.flyingCards)
  return createPortal(
    <>
      {flyingCards.map(fc => (
        <FlyingCard key={fc.id} animation={fc} />
      ))}
    </>,
    document.body,
  )
}