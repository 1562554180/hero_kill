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
    sheShenSelectedCardIds,
    shenTouActive,
    shuCaiActive, shuCaiTargetId,
    selectShuCaiTarget,
    qiYiDecision, qiYiStep,
    pickQiYiDecisionTarget,
    buDao3GivePrompt,
    taiJiPrompt,
    derived,
    confirmTarget, toggleTarget, toggleKillMultiTarget,
    selectLuYeQiangTarget, selectTanNangTarget, selectFudiTarget,
    pickTreasureTarget, selectManWuTarget,
    assignSheShenCard,
    selectBuDao3Target,
    selectTaiJiTarget,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, pendingCardId: s.pendingCardId, pendingCardType: s.pendingCardType, playerHand: s.playerHand,
    selectedTargetId: s.selectedTargetId, selectedTargets: s.selectedTargets,
    jieDaoHolders: s.jieDaoHolders, jieDaoCandidates: s.jieDaoCandidates,
    luYeQiangCandidates: s.luYeQiangCandidates,
    manWuPrompt: s.manWuPrompt,
    treasureTargetIds: s.treasureTargetIds,
    xiaDanActive: s.xiaDanActive,
    sheShenSelectedCardIds: s.sheShenSelectedCardIds,
    shenTouActive: s.shenTouActive,
    shuCaiActive: s.shuCaiActive, shuCaiTargetId: s.shuCaiTargetId,
    selectShuCaiTarget: s.selectShuCaiTarget,
    qiYiDecision: s.qiYiDecision, qiYiStep: s.qiYiStep,
    pickQiYiDecisionTarget: s.pickQiYiDecisionTarget,
    buDao3GivePrompt: s.buDao3GivePrompt,
    taiJiPrompt: s.taiJiPrompt,
    derived: s.derived,
    confirmTarget: s.confirmTarget, toggleTarget: s.toggleTarget, toggleKillMultiTarget: s.toggleKillMultiTarget,
    selectLuYeQiangTarget: s.selectLuYeQiangTarget, selectTanNangTarget: s.selectTanNangTarget, selectFudiTarget: s.selectFudiTarget,
    pickTreasureTarget: s.pickTreasureTarget, selectManWuTarget: s.selectManWuTarget,
    assignSheShenCard: s.assignSheShenCard,
    selectBuDao3Target: s.selectBuDao3Target,
    selectTaiJiTarget: s.selectTaiJiTarget,
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
        { left: '8px', bottom: '2%' },
        { right: '8px', bottom: '2%' },
      ]
    } else {
      const topCount = n - 2
      const positions: CSSProperties[] = [{ left: '8px', bottom: '2%' }]
      // 上排: 以 50% 为中心, 按数量紧凑分布 (每张卡片占约 16% 宽度)
      const topStep = 16
      const topStart = 50 - (topCount - 1) * topStep / 2
      for (let i = 0; i < topCount; i++) {
        const leftPct = topStart + i * topStep
        positions.push({ left: `${leftPct}%`, top: '8px', transform: 'translateX(-50%)' })
      }
      positions.push({ right: '8px', bottom: '2%' })
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
    const card = playerHand.find(c => c.id === pendingCardId)
    // 神偷激活: ♣非探囊手牌一律视为探囊取物 (UI 提示与目标合法性判定统一)
    if (shenTouActive && card?.suit === 'club' && card.name !== '探囊取物') return '探囊取物'
    return card?.name ?? null
  })()
  const pendingSchemeCard = (() => {
    if (pendingCardType !== 'scheme' || !pendingCardId) return null
    if (pendingCardId === '__jieDaoStep2__') return null
    return playerHand.find(c => c.id === pendingCardId) ?? null
  })()
  const isValidTarget = (heroId: string): boolean => {
    // 阶段 3 步骤 C: 改为纯函数, 全部读 derived 快照, 零 engine 调用.
    // 探囊/釜底/借刀/jueJi 的控局免疫 + canBeSchemeTarget 已在 computeDerived 中过滤.
    const inPendingSelect = phase === 'playing' && pendingCardId !== null
    if (inPendingSelect && pendingCardType === 'kill') {
      return derived?.validKillTargetIds.includes(heroId) ?? true
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '借刀杀人' && jieDaoCandidates.length === 0) {
      if (jieDaoHolders.length === 0) return false
      return jieDaoHolders.some(h => h.id === heroId)
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '借刀杀人' && jieDaoCandidates.length > 0) {
      return jieDaoCandidates.some(c => c.id === heroId)
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '探囊取物') {
      return derived?.validTanNangTargetIds.includes(heroId) ?? true
    }
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeCard) {
      const ids = derived?.validSchemeTargetIdsByCardId[pendingSchemeCard.id]
      return ids ? ids.includes(heroId) : true
    }
    if (phase === 'selectTarget' && pendingCardType === 'kill') {
      return derived?.validKillTargetIds.includes(heroId) ?? true
    }
    if (phase === 'selectTarget' && pendingCardType === 'scheme' && pendingSchemeName === '探囊取物') {
      return derived?.validTanNangTargetIds.includes(heroId) ?? true
    }
    if (phase === 'selectTarget' && pendingCardType === 'scheme' && pendingSchemeCard) {
      const ids = derived?.validSchemeTargetIdsByCardId[pendingSchemeCard.id]
      return ids ? ids.includes(heroId) : true
    }
    if (phase === 'treasureSelectTarget') {
      const tSkill = useBattleStore.getState().treasureSkill
      if (tSkill === 'jue-ji') return derived?.validJueJiTargetIds.includes(heroId) ?? true
      // 疗伤/治愈: 只能选不满血的角色
      if (tSkill === 'liao-shang' || tSkill === 'zhi-yu') {
        const target = gameState?.heroes.find(h => h.hero.id === heroId)
        return !!target && target.currentHp > 0 && target.currentHp < target.maxHp
      }
    }
    if (phase === 'selectFudiTarget') {
      return derived?.validFudiTargetIds.includes(heroId) ?? true
    }
    return true
  }
  const dimInvalidTargets = !!(derived && (
    (phase === 'selectTarget' && (pendingCardType === 'kill' || (pendingCardType === 'scheme' && pendingSchemeName === '探囊取物'))) ||
    (phase === 'treasureSelectTarget' && (useBattleStore.getState().treasureSkill === 'jue-ji' || useBattleStore.getState().treasureSkill === 'liao-shang' || useBattleStore.getState().treasureSkill === 'zhi-yu')) ||
    (phase === 'selectFudiTarget') ||
    // 起义 (陈胜 摸牌前) 选目标: 灰掉无手牌 / 非候选的英雄
    (phase === 'qiYiPrompt' && qiYiStep === 'pickTargets')
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
            // 起义 (treasureSkill): 仅允许选有手牌的英雄
            (phase === 'treasureSelectTargets' && useBattleStore.getState().treasureSkill === 'qi-yi' && h.handCards.length > 0) ||
            // 起义 (陈胜 摸牌前): 仅允许选有手牌的英雄
            (phase === 'qiYiPrompt' && qiYiStep === 'pickTargets' && !!qiYiDecision?.candidates.some(c => c.id === h.hero.id) && h.handCards.length > 0) ||
            (phase === 'selectFudiTarget' && isValidTarget(h.hero.id)) ||
            (phase === 'sheShenDistribute' && h.currentHp > 0) ||
            (manWuPrompt !== null && manWuPrompt.candidates.some((c: any) => c.id === h.hero.id)) ||
            (shuCaiActive && h.currentHp > 0) ||
            // 布道: 选牌后点存活角色 (含自己) 给出
            (phase === 'buDao3Give' && !!buDao3GivePrompt?.selectedCardId && !!buDao3GivePrompt.candidates.find(c => c.id === h.hero.id)) ||
            // 太极: 选杀后点攻击范围内角色反击
            (phase === 'taiJi' && !!taiJiPrompt?.selectedCardId && !!taiJiPrompt.candidates.find(c => c.id === h.hero.id))
          )
        }
        isSelected={selectedTargetId === h.hero.id || selectedTargets.includes(h.hero.id) || (shuCaiActive && shuCaiTargetId === h.hero.id) || (phase === 'qiYiPrompt' && qiYiStep === 'pickTargets' && treasureTargetIds.includes(h.hero.id)) || (phase === 'buDao3Give' && buDao3GivePrompt?.candidates.find(c => c.id === h.hero.id)?.id === h.hero.id && !!buDao3GivePrompt.selectedCardId) || (phase === 'taiJi' && !!taiJiPrompt?.selectedCardId && !!taiJiPrompt.candidates.find(c => c.id === h.hero.id))}
        dimmed={(!!dimInvalid && !isValidTarget(h.hero.id)) || (shouldDimInvalidTargets && !isValidTarget(h.hero.id))}
        onClick={() => {
          if (phase === 'taiJi' && taiJiPrompt?.selectedCardId) {
            if (taiJiPrompt.candidates.some(c => c.id === h.hero.id) && h.currentHp > 0) {
              selectTaiJiTarget(h.hero.id)
            }
            return
          }
          if (phase === 'buDao3Give' && buDao3GivePrompt?.selectedCardId) {
            if (buDao3GivePrompt.candidates.some(c => c.id === h.hero.id) && h.currentHp > 0) {
              selectBuDao3Target(h.hero.id)
            }
            return
          }
          if (shuCaiActive) {
            if (h.currentHp > 0) selectShuCaiTarget(h.hero.id)
            return
          }
          if (phase === 'sheShenDistribute') {
            if (sheShenSelectedCardIds.length > 0 && h.currentHp > 0) assignSheShenCard(h.hero.id)
            return
          }
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
          else if (phase === 'qiYiPrompt' && qiYiStep === 'pickTargets') {
            // 起义 (陈胜 摸牌前): 直接点击场上英雄选择/取消
            if (h.handCards.length === 0) return
            if (!qiYiDecision?.candidates.some(c => c.id === h.hero.id)) return
            pickQiYiDecisionTarget(h.hero.id)
            return
          }
          else if (phase === 'treasureSelectTargets') {
            // 起义: 仅选有手牌的英雄 (其他 treasureSkill 当前未使用 treasureSelectTargets 阶段)
            if (useBattleStore.getState().treasureSkill === 'qi-yi' && h.handCards.length === 0) return
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
