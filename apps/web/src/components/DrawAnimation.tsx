import { useEffect, useState } from 'react'
import type { Hero, HeroStone } from '@hero-legend/shared-types'
import { HeroStoneIcon } from './HeroStoneIcon'

interface Props {
  stones: HeroStone[]
  heroes: Hero[]                       // 用于显示名字 + 阵营 (服务端带过来)
  count: 1 | 10                       // 上一次抽卡的数量 (决定继续抽的按钮文案 + 消耗)
  onContinue: () => void              // 点击 "继续抽" 的回调 (RecruitPage 调用 draw(count))
  onClose: () => void                 // 点击 "返回" 关闭动画
}

const POOL_LABEL: Record<string, string> = {
  baili: '初级',
  qianli: '中级',
  wanli: '高级',
}

const STAR_NAME_COLOR: Record<number, string> = {
  1: '#9e9e9e',
  2: '#66bb6a',
  3: '#42a5f5',
  4: '#ab47bc',
  5: '#ffd54f',
}

/**
 * 抽卡动画: 单抽=1 张直接翻牌, 十连=10 张依次飞入后逐张翻开
 * 全部展示完才可继续抽 (防止节奏太快)
 */
export function DrawAnimation({ stones = [], heroes = [], count, onContinue, onClose }: Props) {
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
  const continueLabel = count === 1 ? '继续单抽 (消耗 1 张)' : '继续十连 (消耗 9 张)'

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
        onClick={onContinue}
        style={{
          marginTop: '32px', padding: '10px 32px', fontSize: '16px',
          opacity: allRevealed ? 1 : 0.4,
        }}
      >
        {allRevealed ? continueLabel : '翻开中...'}
      </button>

      <button
        onClick={onClose}
        style={{
          marginTop: '8px', padding: '4px 12px', fontSize: '12px',
          background: 'transparent', color: 'var(--text-muted)',
          border: 'none', cursor: 'pointer',
        }}
      >
        返回
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
          background: 'linear-gradient(135deg, rgba(93,64,55,0.45), rgba(62,39,35,0.45))',
          border: '2px solid #ffd54f',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', padding: '6px',
          boxSizing: 'border-box',
          gap: '2px',
        }}>
          <HeroStoneIcon heroId={stone.heroId} starLevel={stone.starLevel} size={72} />
          <div style={{
            fontSize: '13px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1, marginTop: '2px',
            color: STAR_NAME_COLOR[Math.min(stone.starLevel, 5)] ?? '#fff',
          }}>{heroName}</div>
        </div>
      </div>
    </div>
  )
}