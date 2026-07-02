import { useMemo } from 'react'
import { useBattleStore } from '../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'

import { FlyingCardOverlay } from './FlyingCardOverlay'
import { DirectionalLineOverlay } from './DirectionalLineOverlay'
import { DamageFloaterOverlay } from './DamageFloaterOverlay'
import { BattleLog } from './BattleLog'
import { SkillBar } from './battle/SkillBar'
import { BattleOverlays } from './battle/BattleOverlays'
import { FloatingPrompts } from './battle/FloatingPrompts'
import { PlayerHand } from './battle/PlayerHand'
import { PlayerHeroCard } from './battle/PlayerHeroCard'
import { BattleField } from './battle/BattleField'

export function BattleBoard() {
  const { gameState, actionLog } = useBattleStore(useShallow(s => ({
    gameState: s.gameState,
    actionLog: s.actionLog,
  })))

  // gameState 存在时玩家必存在 (引擎保证), 仅作早返守卫
  const player = useMemo(() => gameState?.heroes.find(h => h.role === 'player'), [gameState])

  if (!gameState || !player) return null

  return (
    <div style={{ display: 'flex', gap: '8px', height: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
      {/* 左侧: 战报 */}
      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BattleLog logs={actionLog} />
      </div>

      {/* 右侧: 战场 + 玩家区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, minHeight: 0 }}>
        <BattleField />

        {/* 玩家区 (左下) */}
        <div style={{
          position: 'relative',
          background: 'var(--bg-medium)',
          border: '1px solid var(--border-wood)',
          borderRadius: '8px',
          padding: '8px',
          flex: '0 0 auto',
          minHeight: '140px',
          overflow: 'visible',
        }}>
          <FloatingPrompts />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            <PlayerHeroCard />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '6px' }}>
              <PlayerHand />
              <SkillBar />
            </div>
          </div>
        </div>

        <BattleOverlays />
        {/* 中心 marker: 飞行卡的中心点定位参考 (1x1 不可见) */}
        <div data-center-marker style={{ position: 'fixed', top: '50%', left: '50%', width: '1px', height: '1px', pointerEvents: 'none', zIndex: -1 }} />
        <FlyingCardOverlay />
        <DirectionalLineOverlay />
        <DamageFloaterOverlay />
      </div>
    </div>
  )
}
