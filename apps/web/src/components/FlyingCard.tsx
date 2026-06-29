// apps/web/src/components/FlyingCard.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { HandCardVisual } from './HandCardVisual'
import type { Card } from '@hero-legend/shared-types'

export interface FlyingStage {
  from: { x: number; y: number }
  to: { x: number; y: number }
  durationMs: number
  endScale?: number
  endOpacity?: number
}

export interface FlyingCard {
  id: string
  card: Card
  stages: FlyingStage[]
  onDone: () => void
}

const EASE = [0.25, 0.1, 0.25, 1] as const

export function FlyingCard({ animation }: { animation: FlyingCard }) {
  const [stageIdx, setStageIdx] = useState(0)
  const stage = animation.stages[stageIdx]
  return (
    <motion.div
      initial={{ x: stage.from.x, y: stage.from.y, scale: 1, opacity: 1 }}
      animate={{
        x: stage.to.x,
        y: stage.to.y,
        scale: stage.endScale ?? 1,
        opacity: stage.endOpacity ?? 1,
      }}
      transition={{ duration: stage.durationMs / 1000, ease: EASE }}
      onAnimationComplete={() => {
        if (stageIdx < animation.stages.length - 1) {
          setStageIdx(stageIdx + 1)
        } else {
          animation.onDone()
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2000,
        pointerEvents: 'none',
        transformOrigin: 'center center',
      }}
    >
      <HandCardVisual card={animation.card} />
    </motion.div>
  )
}