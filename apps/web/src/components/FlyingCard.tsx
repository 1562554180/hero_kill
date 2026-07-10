// apps/web/src/components/FlyingCard.tsx
import { memo, useState, useEffect } from 'react'
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

function FlyingCardInner({ animation }: { animation: FlyingCard }) {
  const [stageIdx, setStageIdx] = useState(0)
  const [vanishing, setVanishing] = useState(false)
  const stage = animation.stages[stageIdx]
  const isLastStage = stageIdx === animation.stages.length - 1
  // 用 setTimeout 推进 stage (而不是依赖 framer-motion 的 onAnimationComplete).
  // 中间 "暂停" stage 的 from===to 且无 endScale/endOpacity 变化时, framer-motion 不会触发 onAnimationComplete, 导致后续 stage 不跑.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLastStage) {
        setStageIdx(stageIdx + 1)
      } else {
        // 最后一段: 短暂停留后切换为"不能点"阴影样式, 紧接着立即消失
        window.setTimeout(() => {
          setVanishing(true)
          window.setTimeout(() => animation.onDone(), 180)
        }, 80)
      }
    }, stage.durationMs)
    return () => clearTimeout(timer)
  }, [stageIdx, stage.durationMs, animation, isLastStage])
  return (
    <motion.div
      initial={{ x: stage.from.x, y: stage.from.y, scale: 1, opacity: 1 }}
      animate={{
        x: stage.to.x,
        y: stage.to.y,
        scale: stage.endScale ?? 1,
        opacity: vanishing ? 0.45 : (stage.endOpacity ?? 1),
      }}
      transition={{
        duration: vanishing ? 0.08 : stage.durationMs / 1000,
        ease: EASE,
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2000,
        pointerEvents: 'none',
        transformOrigin: 'center center',
        filter: vanishing ? 'grayscale(0.4) brightness(0.85)' : 'none',
      }}
    >
      <HandCardVisual card={animation.card} />
    </motion.div>
  )
}
export const FlyingCard = memo(FlyingCardInner)

