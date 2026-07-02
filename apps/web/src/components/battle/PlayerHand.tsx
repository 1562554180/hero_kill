import { useEffect, useMemo, useRef, useState } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'
import { HandCard } from '../HandCard'
import type { Card } from '@hero-legend/shared-types'

const HAND_CARD_WIDTH = 55
const HAND_CARD_GAP = 6

export function PlayerHand() {
  const {
    gameState, phase, playerHand, pendingCardId,
    selectedDualCards, treasureCardIds, treasureSkill, yuRenCardIds,
    selectedDiscardCards, fuChouPickSelected,
    manWuSelectedCardId, manWuRedHeartCards,
    luYeQiangKillCardId,
    fuChouTriggerPrompt, fuChouChoosePrompt,
    game,
    toggleDualCard, toggleDiscardCard, toggleFuChouPick,
    pickTreasureCard, pickXiaDanCard,
    selectTianXiangCard, selectManWuCard, selectBuDaoCard,
    playKill, playHeal, equipCard, playScheme, playSchemeSelf,
    judgeReplace, respondWithCard, huiChunHeal,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, playerHand: s.playerHand, pendingCardId: s.pendingCardId,
    selectedDualCards: s.selectedDualCards, treasureCardIds: s.treasureCardIds, treasureSkill: s.treasureSkill, yuRenCardIds: s.yuRenCardIds,
    selectedDiscardCards: s.selectedDiscardCards, fuChouPickSelected: s.fuChouPickSelected,
    manWuSelectedCardId: s.manWuSelectedCardId, manWuRedHeartCards: s.manWuRedHeartCards,
    luYeQiangKillCardId: s.luYeQiangKillCardId,
    fuChouTriggerPrompt: s.fuChouTriggerPrompt, fuChouChoosePrompt: s.fuChouChoosePrompt,
    game: s.game,
    toggleDualCard: s.toggleDualCard, toggleDiscardCard: s.toggleDiscardCard, toggleFuChouPick: s.toggleFuChouPick,
    pickTreasureCard: s.pickTreasureCard, pickXiaDanCard: s.pickXiaDanCard,
    selectTianXiangCard: s.selectTianXiangCard, selectManWuCard: s.selectManWuCard, selectBuDaoCard: s.selectBuDaoCard,
    playKill: s.playKill, playHeal: s.playHeal, equipCard: s.equipCard, playScheme: s.playScheme, playSchemeSelf: s.playSchemeSelf,
    judgeReplace: s.judgeReplace, respondWithCard: s.respondWithCard, huiChunHeal: s.huiChunHeal,
  })))

  const player = useMemo(() => gameState?.heroes.find(h => h.role === 'player'), [gameState])

  // 派生标量
  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const canPlayKill = game?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true
  const aoJianActive = game?.isAoJianActive(player?.hero?.id ?? '') ?? false
  const playerHero = player?.instance
  const allSkills = player?.hero.skills ?? []
  const allTreasures = [
    ...(playerHero?.treasures?.main ?? []),
    ...(playerHero?.treasures?.sub ?? []),
  ].filter(Boolean)
  const hasSkillOrTreasure = (id: string) =>
    allSkills.some(sk => sk.id === id) || allTreasures.some(t => t?.skill.id === id || t?.skill.id === `treasure-${id}`)
  const hasHongZhuang = hasSkillOrTreasure('hong-zhuang')
  const hasHuiChun = hasSkillOrTreasure('hui-chun')
  const huiChunAvailable = hasHuiChun && !isPlayerTurn && !isFullHp
  const hasLeiInJudge = player?.judgeCards?.some(cid => {
    const c = game?.getPlayerById(player.hero.id)?.getJudgeCards()?.find((x: Card) => x.id === cid)
    return c?.name === '手捧雷'
  }) ?? false

  const hasValidSchemeTarget = (cardName: string): boolean => {
    if (!game) return true
    const attacker = game.getPlayer()
    if (!attacker) return true
    if (cardName === '探囊取物') {
      return game.getEnemies(attacker).some(e => e.isAlive() && game.canTanNang(attacker, e))
    }
    if (cardName === '釜底抽薪') {
      return game.getEnemies(attacker).some(e => e.isAlive() &&
        (e.getHandSize() > 0 || game.collectEquipmentCards(e).length > 0 || e.getJudgeCards().length > 0))
    }
    if (cardName === '借刀杀人') {
      return game.players.some(p => p.isAlive() && p.getId() !== attacker.getId() && !!p.getEquippedCard('weapon'))
    }
    return true
  }

  // 手牌容器宽度 — 判断是否启用叠放
  const handContainerRef = useRef<HTMLDivElement>(null)
  const [handContainerWidth, setHandContainerWidth] = useState(0)
  useEffect(() => {
    const el = handContainerRef.current
    if (!el) return
    setHandContainerWidth(el.offsetWidth)
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setHandContainerWidth(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [playerHand.length])

  const handNeedsOverlap = playerHand.length > 0 && playerHand.length * HAND_CARD_WIDTH > handContainerWidth
  const handOverlapMarginLeft = handNeedsOverlap && playerHand.length > 1 && handContainerWidth > 0
    ? Math.min(-2, Math.floor((handContainerWidth - 8 - HAND_CARD_WIDTH) / (playerHand.length - 1)) - HAND_CARD_WIDTH)
    : -32

  return (
    <div ref={handContainerRef} style={{
      flex: 1, minHeight: 0, display: 'flex',
      flexWrap: 'nowrap',
      overflowX: 'hidden',
      overflowY: 'hidden',
      alignItems: handNeedsOverlap ? 'flex-end' : 'stretch',
      gap: handNeedsOverlap ? 0 : '6px',
      padding: handNeedsOverlap ? '10px 4px 8px 0' : '6px 0 6px 0',
    }}>
      {playerHand.map((card, idx) => {
        const isSelectedDual = selectedDualCards.includes(card.id)
        const isSelectedTreasure = treasureCardIds.includes(card.id)
        const isSelectedYuRen = treasureSkill === 'yu-ren' && yuRenCardIds.includes(card.id)
        const isSelectedDiscard = selectedDiscardCards.includes(card.id)
        const isSelectedFuChou = phase === 'selectFuChouDiscard' && fuChouPickSelected.includes(card.id)
        const isSelectedManWu = manWuSelectedCardId === card.id
        const isPending = pendingCardId === card.id
        const isLuYeQiangKillCard = luYeQiangKillCardId === card.id
        return (
          <div
            key={card.id}
            data-card-id={card.id}
            onClick={() => {
              if (phase === 'selectDualCards') toggleDualCard(card.id)
              else if (phase === 'selectDiscardCards') toggleDiscardCard(card.id)
              else if (phase === 'selectFuChouDiscard') toggleFuChouPick(card.id)
              else if (phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards') pickTreasureCard(card.id)
              else if (phase === 'treasureSelectEquipment' && card.type === 'equipment') pickTreasureCard(card.id)
              else if (phase === 'treasureSelectWeapon' && card.type === 'equipment' && (card as any).slot === 'weapon') {
                const g = useBattleStore.getState().game
                const tIds = useBattleStore.getState().treasureTargetIds
                const p = g!.getPlayer()!
                g!.playerJueJi(p, card.id, tIds[0])
                useBattleStore.setState({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], treasureTargetIds: [], gameState: g!.getState(), playerHand: p.getHand() })
              } else if (phase === 'xiaDanPickCard') {
                pickXiaDanCard(card.id)
              } else if (phase === 'tianXiang') {
                selectTianXiangCard(card.id)
              } else if (manWuRedHeartCards.length > 0 && manWuRedHeartCards.some(c => c.id === card.id)) {
                selectManWuCard(isSelectedManWu ? null : card.id)
              } else if (phase === 'buDaoKill' && game?.canPlayerUseAsKill(card.id)) {
                selectBuDaoCard(card.id)
              }
            }}
            style={{
              flexShrink: handNeedsOverlap ? 0 : 1,
              alignSelf: 'flex-end',
              marginLeft: handNeedsOverlap && idx > 0 ? handOverlapMarginLeft : 0,
              outline: (isSelectedDual || isSelectedTreasure || isSelectedYuRen || isSelectedDiscard || isSelectedFuChou || isSelectedManWu) ? '2px solid #b8860b' : 'none',
              borderRadius: '4px',
              cursor: (phase === 'selectDualCards' || phase === 'selectDiscardCards' || phase === 'selectFuChouDiscard' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard' || phase === 'tianXiang' || phase === 'buDaoKill' || manWuRedHeartCards.length > 0) ? 'pointer' : undefined,
              zIndex: isPending ? 2 : 0,
              position: 'relative',
            }}
          >
            <HandCard
              card={card}
              disabled={!(isPlayerTurn || phase === 'judgeReplace' || phase === 'awaitingResponse' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard' || phase === 'tianXiang' || phase === 'buDaoKill' || phase === 'selectFuChouDiscard' || huiChunAvailable) || !!fuChouTriggerPrompt || !!fuChouChoosePrompt}
              canPlayKill={canPlayKill}
              isFullHp={isFullHp}
              aoJianActive={aoJianActive}
              hasHongZhuang={hasHongZhuang}
              hasLeiInJudge={hasLeiInJudge}
              isResponse={phase === 'awaitingResponse'}
              isJudgeReplace={phase === 'judgeReplace'}
              isPending={isPending}
              isLifted={isPending}
              treasureSelectMode={phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'xiaDanPickCard'}
              selectDualMode={phase === 'selectDualCards'}
              selectDiscardMode={phase === 'selectDiscardCards' || phase === 'selectFuChouDiscard'}
              isHandCardSelect={
                phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment'
                || phase === 'xiaDanPickCard' || phase === 'selectDualCards' || phase === 'selectDiscardCards'
                || phase === 'selectFuChouDiscard' || phase === 'tianXiang' || phase === 'buDaoKill'
                || manWuRedHeartCards.length > 0 || phase === 'chaoTuoPick'
              }
              isLuYeQiangKillCard={isLuYeQiangKillCard}
              hasValidSchemeTarget={hasValidSchemeTarget(card.name)}
              huiChunAvailable={huiChunAvailable}
              onPlayKill={playKill}
              onPlayHeal={playHeal}
              onEquip={equipCard}
              onPlayScheme={playScheme}
              onPlaySchemeSelf={playSchemeSelf}
              onJudgeReplace={judgeReplace}
              onRespondWithCard={respondWithCard}
              onHuiChunHeal={huiChunHeal}
            />
          </div>
        )
      })}
    </div>
  )
}
