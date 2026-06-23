import { useEffect, useState } from 'react'
import type { Hero, HeroStone } from '@hero-legend/shared-types'

interface Props {
  stones: HeroStone[]
  heroes: Hero[]                       // 用于显示名字 + 阵营 (服务端带过来)
  onClose: () => void
}

const POOL_LABEL: Record<string, string> = {
  baili: '百里',
  qianli: '千里',
  wanli: '万里',
}

/**
 * 抽卡动画: 单抽=1 张直接翻牌, 十连=10 张依次飞入后逐张翻开
 * 全部展示完才可关闭 (防止节奏太快)
 */
export function DrawAnimation({ stones = [], heroes = [], onClose }: Props) {
  const heroMap = new Map(heroes.map(h => [h.id, h]))
  const [revealedCount, setRevealedCount] = useState(0)
  const [enteredCount, setEnteredCount] = useState(0)

  // 飞入节奏: 每张错开 120ms
  useEffect(() => {
    if (enteredCount >= stones.length) return
    const t = setTimeout(() => setEnteredCount(c => c + 1), 120)
    return () => clearTimeout(t)
  }, [enteredCount, stones.length])

  // 翻牌节奏: 飞入完成后, 每张错开 200ms
  useEffect(() => {
    if (enteredCount < stones.length) return
    if (revealedCount >= stones.length) return
    const t = setTimeout(() => setRevealedCount(c => c + 1), 200)
    return () => clearTimeout(t)
  }, [enteredCount, revealedCount, stones.length])

  const allRevealed = revealedCount >= stones.length

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}>
      <h2 style={{ color: 'var(--text-gold)', marginBottom: '24px' }}>
        抽卡结果 ({revealedCount}/{stones.length})
      </h2>

      {/* 卡片布局: 单抽居中, 十连 5x2 网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: stones.length === 1 ? '1fr' : 'repeat(5, 1fr)',
        gap: '12px',
        maxWidth: stones.length === 1 ? '200px' : '600px',
        width: '100%',
      }}>
        {stones.map((stone, i) => {
          const entered = i < enteredCount
          const revealed = i < revealedCount
          const hero = heroMap.get(stone.heroId)
          return (
            <StoneCard
              key={stone.stoneId}
              entered={entered}
              revealed={revealed}
              stone={stone}
              heroName={hero?.name ?? '?'}
              heroFaction={hero?.faction ?? '?'}
            />
          )
        })}
      </div>

      <button
        disabled={!allRevealed}
        onClick={onClose}
        style={{
          marginTop: '32px', padding: '10px 32px', fontSize: '16px',
          opacity: allRevealed ? 1 : 0.4,
        }}
      >
        {allRevealed ? '收下 (去背包使用)' : '翻开中...'}
      </button>
    </div>
  )
}

function StoneCard({
  entered, revealed, stone, heroName, heroFaction,
}: {
  entered: boolean
  revealed: boolean
  stone: HeroStone
  heroName: string
  heroFaction: string
}) {
  const isHigh = stone.starLevel >= 4
  const starStr = '★'.repeat(stone.starLevel) + '☆'.repeat(5 - stone.starLevel)
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      paddingTop: '140%',
      perspective: '800px',
      opacity: entered ? 1 : 0,
      transform: entered
        ? (revealed ? 'translateY(0) scale(1)' : 'translateY(0) scale(1)')
        : 'translateY(40px) scale(0.7)',
      transition: 'opacity 0.3s, transform 0.3s',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        transformStyle: 'preserve-3d',
        transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s',
      }}>
        {/* 牌背 */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #5d4037, #3e2723)',
          border: '2px solid #ffd54f',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffd54f', fontSize: '24px', fontWeight: 'bold',
        }}>
          {POOL_LABEL[stone.pool]}
        </div>
        {/* 正面 */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: isHigh
            ? 'linear-gradient(135deg, #ff6b6b, #c62828)'
            : 'linear-gradient(135deg, #5d4037, #3e2723)',
          border: `2px solid ${isHigh ? '#ff6b6b' : '#ffd54f'}`,
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', padding: '8px',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>{heroFaction}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{heroName}</div>
          <div style={{
            fontSize: '14px', color: '#ffd54f', marginTop: '8px', letterSpacing: '2px',
          }}>{starStr}</div>
          <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.8 }}>英雄石</div>
        </div>
      </div>
    </div>
  )
}