import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'
import { HeroBattleCard } from '../HeroBattleCard'

export function BattleField() {
  const {
    gameState, phase, pendingCardId, pendingCardType, playerHand,
    selectedTargetId, selectedTargets,
    jieDaoHolders, jieDaoCandidates,
    luYeQiangCandidates,
    manWuPrompt,
    treasureTargetIds,
    xiaDanActive,
    game,
    confirmTarget, toggleTarget, toggleKillMultiTarget,
    selectLuYeQiangTarget, selectTanNangTarget, selectFudiTarget,
    pickTreasureTarget, selectManWuTarget,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, pendingCardId: s.pendingCardId, pendingCardType: s.pendingCardType, playerHand: s.playerHand,
    selectedTargetId: s.selectedTargetId, selectedTargets: s.selectedTargets,
    jieDaoHolders: s.jieDaoHolders, jieDaoCandidates: s.jieDaoCandidates,
    luYeQiangCandidates: s.luYeQiangCandidates,
    manWuPrompt: s.manWuPrompt,
    treasureTargetIds: s.treasureTargetIds,
    xiaDanActive: s.xiaDanActive,
    game: s.game,
    confirmTarget: s.confirmTarget, toggleTarget: s.toggleTarget, toggleKillMultiTarget: s.toggleKillMultiTarget,
    selectLuYeQiangTarget: s.selectLuYeQiangTarget, selectTanNangTarget: s.selectTanNangTarget, selectFudiTarget: s.selectFudiTarget,
    pickTreasureTarget: s.pickTreasureTarget, selectManWuTarget: s.selectManWuTarget,
  })))

  const dyingTargetId = useBattleStore(s => s.dyingRescuePrompt?.targetId ?? null)

  const { others, otherPositions } = useMemo(() => {
    const enemies = gameState?.heroes.filter(h => h.role === 'enemy') ?? []
    const allies = gameState?.heroes.filter(h => h.role === 'ally') ?? []
    const player = gameState?.heroes.find(h => h.role === 'player')
    // others 与引擎 seating 顺序一致 ([player, allies..., enemies...])
    const others = [...allies, ...enemies]
    const n = others.length
    let otherPositions: CSSProperties[]
    if (n === 1) {
      otherPositions = [{ left: '50%', top: '8px', transform: 'translateX(-50%)' }]
    } else if (n === 2) {
      otherPositions = [
        { left: '8px', top: '50%' },
        { right: '8px', top: '50%' },
      ]
    } else {
      const topCount = n - 2
      const positions: CSSProperties[] = [{ left: '8px', top: '50%' }]
      for (let i = 0; i < topCount; i++) {
        const leftPct = 5 + (i + 0.5) * (90 / topCount)
        positions.push({ left: `${leftPct}%`, top: '8px' })
      }
      positions.push({ right: '8px', top: '50%' })
      otherPositions = positions
    }
    return { others, otherPositions, player }
  }, [gameState])

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const isPendingTargeting = phase === 'playing' && pendingCardId !== null && (pendingCardType === 'kill' || pendingCardType === 'scheme')
  const shouldDimInvalidTargets = isPendingTargeting

  const pendingSchemeName = (() => {
    if (pendingCardType !== 'scheme' || !pendingCardId) return null
    if (pendingCardId === '__jieDaoStep2__') return '借刀杀人'
    return playerHand.find(c => c.id === pendingCardId)?.name ?? null
  })()
  const pendingSchemeCard = (() => {
    if (pendingCardType !== 'scheme' || !pendingCardId) return null
    if (pendingCardId === '__jieDaoStep2__') return null
    return playerHand.find(c => c.id === pendingCardId) ?? null
  })()
  const isValidTarget = (heroId: string): boolean => {
    if (!game) return true
    const attacker = game.getPlayer()
    const target = game.getPlayerById(heroId)
    if (!attacker || !target) return true
    const inPendingSelect = phase === 'playing' && pendingCardId !== null
    if (inPendingSelect && pendingCardType === 'kill') {
      return game.isInAttackRange(attacker, target)
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '借刀杀人' && jieDaoCandidates.length === 0) {
      if (jieDaoHolders.length === 0) return false
      return jieDaoHolders.some(h => h.id === heroId)
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '借刀杀人' && jieDaoCandidates.length > 0) {
      return jieDaoCandidates.some(c => c.id === heroId)
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '探囊取物') {
      if (!game.canTanNang(attacker, target)) return false
      if (game.isKongJuImmuneTo(target, '探囊取物')) return false
      return true
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeCard) {
      if (!game.canBeSchemeTarget(target, pendingSchemeCard)) return false
      if (pendingSchemeName && game.isKongJuImmuneTo(target, pendingSchemeName)) return false
      return true
    }
    if (phase === 'selectTarget' && pendingCardType === 'kill') {
      return game.isInAttackRange(attacker, target)
    }
    if (phase === 'selectTarget' && pendingCardType === 'scheme' && pendingSchemeName === '探囊取物') {
      if (!game.canTanNang(attacker, target)) return false
      if (game.isKongJuImmuneTo(target, '探囊取物')) return false
      return true
    }
    if (phase === 'selectTarget' && pendingCardType === 'scheme' && pendingSchemeCard) {
      if (!game.canBeSchemeTarget(target, pendingSchemeCard)) return false
      if (pendingSchemeName && game.isKongJuImmuneTo(target, pendingSchemeName)) return false
      return true
    }
    if (phase === 'treasureSelectTarget') {
      const tSkill = useBattleStore.getState().treasureSkill
      if (tSkill === 'jue-ji') return game.isInAttackRange(attacker, target)
    }
    if (phase === 'selectFudiTarget') {
      const hasAny = target.getHandSize() > 0 || game.collectEquipmentCards(target).length > 0 || target.getJudgeCards().length > 0
      return hasAny
    }
    return true
  }
  const dimInvalidTargets = !!(game && (
    (phase === 'selectTarget' && (pendingCardType === 'kill' || (pendingCardType === 'scheme' && pendingSchemeName === '探囊取物'))) ||
    (phase === 'treasureSelectTarget' && useBattleStore.getState().treasureSkill === 'jue-ji') ||
    (phase === 'selectFudiTarget')
  ))

  const renderOtherHeroCard = (h: typeof others[0], dimInvalid?: boolean) => {
    const isDying = h.currentHp === 0 && dyingTargetId === h.hero.id
    const isDead = h.currentHp <= 0 && !isDying
    return (
      <HeroBattleCard
        key={h.hero.id}
        hero={h}
        isCurrentTurn={gameState!.currentHeroId === h.hero.id && !isPlayerTurn}
        isDying={isDying}
        isDead={isDead}
        isSelectable={
          (h.currentHp > 0 && !(xiaDanActive && h.handCards.length === 0)) &&
          (
            (phase === 'selectTarget' && isValidTarget(h.hero.id)) ||
            (isPendingTargeting && isValidTarget(h.hero.id)) ||
            (phase === 'selectMultiTargets') ||
            (phase === 'selectKillMultiTargets') ||
            (phase === 'selectLuYeQiangTarget' && luYeQiangCandidates.some(lc => lc.id === h.hero.id)) ||
            (phase === 'treasureSelectTarget') ||
            (phase === 'treasureSelectTargets') ||
            (phase === 'selectFudiTarget' && isValidTarget(h.hero.id)) ||
            (manWuPrompt !== null && manWuPrompt.candidates.some((c: any) => c.id === h.hero.id))
          )
        }
        isSelected={selectedTargetId === h.hero.id || selectedTargets.includes(h.hero.id)}
        dimmed={(!!dimInvalid && !isValidTarget(h.hero.id)) || (shouldDimInvalidTargets && !isValidTarget(h.hero.id))}
        onClick={() => {
          if (isPendingTargeting) {
            if (isValidTarget(h.hero.id)) confirmTarget(h.hero.id)
            return
          }
          if (phase === 'selectTarget') confirmTarget(h.hero.id)
          else if (phase === 'selectMultiTargets') toggleTarget(h.hero.id)
          else if (phase === 'selectKillMultiTargets') toggleKillMultiTarget(h.hero.id)
          else if (phase === 'selectLuYeQiangTarget') selectLuYeQiangTarget(h.hero.id)
          else if (phase === 'selectTanNangTarget') selectTanNangTarget(h.hero.id)
          else if (phase === 'selectFudiTarget') selectFudiTarget(h.hero.id)
          else if (phase === 'treasureSelectTarget') pickTreasureTarget(h.hero.id)
          else if (manWuPrompt !== null && manWuPrompt.candidates.some((c: any) => c.id === h.hero.id)) selectManWuTarget(h.hero.id)
          else if (phase === 'treasureSelectTargets') {
            const t = treasureTargetIds
            if (t.includes(h.hero.id)) {
              useBattleStore.setState({ treasureTargetIds: t.filter(id => id !== h.hero.id) })
            } else if (t.length < 2) {
              useBattleStore.setState({ treasureTargetIds: [...t, h.hero.id] })
            }
          }
        }}
      />
    )
  }

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: 'var(--bg-dark)', border: '1px solid var(--border-wood)', borderRadius: '8px', padding: '8px', overflow: 'hidden' }}>
      {phase === 'selectTarget' && (
        <div style={{ position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, maxWidth: '60%' }}>
          <div style={{
            padding: '6px 12px',
            background: 'rgba(255,68,68,0.15)', borderRadius: '4px',
            border: '1px solid rgba(255,68,68,0.3)',
            color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
          }}>
            点击敌方英雄选择攻击目标
          </div>
        </div>
      )}

      {others.map((h, i) => (
        <div key={h.hero.id} style={{ position: 'absolute', zIndex: 2, ...otherPositions[i] }}>
          {renderOtherHeroCard(h, isPendingTargeting || dimInvalidTargets)}
        </div>
      ))}
    </div>
  )
}
