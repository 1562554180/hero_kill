import { useMemo } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'
import { HeroBattleCard } from '../HeroBattleCard'

export function PlayerHeroCard() {
  const {
    gameState, phase, pendingCardId, pendingCardType, playerHand,
    selectedTargetId, jieDaoCandidates, jieDaoHolders,
    sheShenSelectedCardIds,
    shuCaiActive, shuCaiTargetId,
    selectShuCaiTarget,
    derived,
    confirmTarget, playKill, respondWithCard, assignSheShenCard,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, pendingCardId: s.pendingCardId, pendingCardType: s.pendingCardType, playerHand: s.playerHand,
    selectedTargetId: s.selectedTargetId, jieDaoCandidates: s.jieDaoCandidates, jieDaoHolders: s.jieDaoHolders,
    sheShenSelectedCardIds: s.sheShenSelectedCardIds,
    shuCaiActive: s.shuCaiActive, shuCaiTargetId: s.shuCaiTargetId,
    selectShuCaiTarget: s.selectShuCaiTarget,
    derived: s.derived,
    confirmTarget: s.confirmTarget, playKill: s.playKill, respondWithCard: s.respondWithCard,
    assignSheShenCard: s.assignSheShenCard,
  })))

  const player = useMemo(() => gameState?.heroes.find(h => h.role === 'player'), [gameState])
  const dyingTargetId = useBattleStore(s => s.dyingRescuePrompt?.targetId ?? null)

  if (!player) return null

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const aoJianActive = derived?.aoJianActive ?? false
  const canPlayKill = derived?.canPlayKill ?? false
  const playerHero = player.instance
  const allSkills = player.hero.skills ?? []
  const allTreasures = [
    ...(playerHero?.treasures?.main ?? []),
    ...(playerHero?.treasures?.sub ?? []),
  ].filter(Boolean)
  const hasSkillOrTreasure = (id: string) =>
    allSkills.some(sk => sk.id === id) || allTreasures.some(t => t?.skill.id === id || t?.skill.id === `treasure-${id}`)
  const hasHongZhuang = hasSkillOrTreasure('hong-zhuang')

  const isPendingTargeting = phase === 'playing' && pendingCardId !== null && (pendingCardType === 'kill' || pendingCardType === 'scheme')

  // 疗伤/治愈: 玩家自己也可以是被治疗目标 (需不满血)
  const tSkill = useBattleStore(s => s.treasureSkill)
  const isHealTargetable = phase === 'treasureSelectTarget'
    && (tSkill === 'liao-shang' || tSkill === 'zhi-yu')
    && player.currentHp > 0
    && player.currentHp < player.maxHp

  // 玩家卡只关心 jieDao step1 (持武器者可被借刀)
  const pendingSchemeName = (() => {
    if (pendingCardType !== 'scheme' || !pendingCardId) return null
    if (pendingCardId === '__jieDaoStep2__') return '借刀杀人'
    return playerHand.find(c => c.id === pendingCardId)?.name ?? null
  })()
  const isPlayerValidTarget = (() => {
    if (!isPendingTargeting) return false
    if (pendingCardType === 'scheme' && pendingSchemeName === '借刀杀人' && jieDaoCandidates.length === 0) {
      return jieDaoHolders.some(h => h.id === player.hero.id)
    }
    return false
  })()

  const isDying = player.currentHp === 0 && dyingTargetId === player.hero.id
  const isDead  = player.currentHp <= 0 && !isDying

  return (
    <HeroBattleCard
      hero={player}
      isCurrentTurn={isPlayerTurn}
      isDying={isDying}
      isDead={isDead}
      isSelectable={(isPendingTargeting && jieDaoCandidates.length > 0 && isPlayerValidTarget) || (phase === 'sheShenDistribute' && player.currentHp > 0) || isHealTargetable || (shuCaiActive && player.currentHp > 0)}
      dimmed={isHealTargetable === false && phase === 'treasureSelectTarget' && (tSkill === 'liao-shang' || tSkill === 'zhi-yu') && player.currentHp > 0}
      isSelected={selectedTargetId === player.hero.id || (shuCaiActive && shuCaiTargetId === player.hero.id)}
      onClick={() => {
        if (shuCaiActive) {
          if (player.currentHp > 0) selectShuCaiTarget(player.hero.id)
          return
        }
        if (phase === 'sheShenDistribute') {
          if (sheShenSelectedCardIds.length > 0 && player.currentHp > 0) assignSheShenCard(player.hero.id)
          return
        }
        if (isHealTargetable) {
          useBattleStore.getState().pickTreasureTarget(player.hero.id)
          return
        }
        if (isPendingTargeting && isPlayerValidTarget) confirmTarget(player.hero.id)
      }}
      aoJianActive={aoJianActive}
      canPlayKill={canPlayKill && (isPlayerTurn || phase === 'awaitingResponse')}
      hasHongZhuang={hasHongZhuang}
      onEquipAsKill={(cardId: string, fromPos) => {
        if (phase === 'playing') playKill(cardId, fromPos)
        else if (phase === 'awaitingResponse') respondWithCard(cardId)
      }}
    />
  )
}
