import { useEffect, useMemo, useRef, useState } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'
import { HandCard } from '../HandCard'

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
    dyingRescuePrompt,
    derived,
    toggleDualCard, toggleDiscardCard, toggleFuChouPick,
    pickTreasureCard, pickXiaDanCard,
    selectTianXiangCard, selectManWuCard, selectBuDaoCard,
    confirmDyingRescue,
    playKill, playHeal, equipCard, playScheme, playSchemeSelf,
    judgeReplace, respondWithCard, huiChunHeal,
    playerJueJiSelf,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, playerHand: s.playerHand, pendingCardId: s.pendingCardId,
    selectedDualCards: s.selectedDualCards, treasureCardIds: s.treasureCardIds, treasureSkill: s.treasureSkill, yuRenCardIds: s.yuRenCardIds,
    selectedDiscardCards: s.selectedDiscardCards, fuChouPickSelected: s.fuChouPickSelected,
    manWuSelectedCardId: s.manWuSelectedCardId, manWuRedHeartCards: s.manWuRedHeartCards,
    luYeQiangKillCardId: s.luYeQiangKillCardId,
    fuChouTriggerPrompt: s.fuChouTriggerPrompt, fuChouChoosePrompt: s.fuChouChoosePrompt,
    dyingRescuePrompt: s.dyingRescuePrompt,
    derived: s.derived,
    toggleDualCard: s.toggleDualCard, toggleDiscardCard: s.toggleDiscardCard, toggleFuChouPick: s.toggleFuChouPick,
    pickTreasureCard: s.pickTreasureCard, pickXiaDanCard: s.pickXiaDanCard,
    selectTianXiangCard: s.selectTianXiangCard, selectManWuCard: s.selectManWuCard, selectBuDaoCard: s.selectBuDaoCard,
    confirmDyingRescue: s.confirmDyingRescue,
    playKill: s.playKill, playHeal: s.playHeal, equipCard: s.equipCard, playScheme: s.playScheme, playSchemeSelf: s.playSchemeSelf,
    judgeReplace: s.judgeReplace, respondWithCard: s.respondWithCard, huiChunHeal: s.huiChunHeal,
    playerJueJiSelf: s.playerJueJiSelf,
  })))

  const player = useMemo(() => gameState?.heroes.find(h => h.role === 'player'), [gameState])

  // 派生标量
  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const canPlayKill = derived?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true
  const aoJianActive = derived?.aoJianActive ?? false
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
  const hasShenTou = hasSkillOrTreasure('shen-tou')
  const huiChunAvailable = hasHuiChun && !isPlayerTurn && !isFullHp
  const hasLeiInJudge = derived?.hasLeiInJudge ?? false

  const hasValidSchemeTarget = (cardName: string, cardSuit?: string): boolean => {
    if (!derived) return true
    if (cardName === '探囊取物' || (hasShenTou && cardSuit === 'club' && cardName !== '探囊取物')) {
      return derived.validTanNangTargetIds.length > 0
    }
    if (cardName === '釜底抽薪') {
      return derived.validFudiTargetIds.length > 0
    }
    if (cardName === '借刀杀人') {
      return derived.hasJieDaoHolder
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
        // 统一: 所有选中状态都用上移表达, 不再用 outline
        const isLifted = isPending || isSelectedDual || isSelectedTreasure || isSelectedYuRen || isSelectedDiscard || isSelectedFuChou || isSelectedManWu
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
                playerJueJiSelf(card.id)
              } else if (phase === 'xiaDanPickCard') {
                pickXiaDanCard(card.id)
              } else if (phase === 'tianXiang') {
                selectTianXiangCard(card.id)
              } else if (manWuRedHeartCards.length > 0 && manWuRedHeartCards.some(c => c.id === card.id)) {
                selectManWuCard(isSelectedManWu ? null : card.id)
              } else if (phase === 'buDaoKill' && (derived?.validKillCardIds.includes(card.id) ?? false)) {
                selectBuDaoCard(card.id)
              } else if (phase === 'dyingRescue' && dyingRescuePrompt?.yaoHandCards.some(c => c.id === card.id)) {
                // 濒死救援: 直接点击药/红桃回春牌使用
                confirmDyingRescue([card.id])
              }
            }}
            style={{
              flexShrink: handNeedsOverlap ? 0 : 1,
              alignSelf: 'flex-end',
              marginLeft: handNeedsOverlap && idx > 0 ? handOverlapMarginLeft : 0,
              outline: 'none',
              borderRadius: '4px',
              cursor: (phase === 'selectDualCards' || phase === 'selectDiscardCards' || phase === 'selectFuChouDiscard' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard' || phase === 'tianXiang' || phase === 'buDaoKill' || phase === 'dyingRescue' || manWuRedHeartCards.length > 0) ? 'pointer' : undefined,
              zIndex: isPending ? 2 : (isLifted ? 1 : 0),
              position: 'relative',
              transform: isLifted ? 'translateY(-12px)' : 'translateY(0)',
              transition: 'transform 0.15s',
            }}
          >
            <HandCard
              card={card}
              disabled={!(isPlayerTurn || phase === 'judgeReplace' || phase === 'awaitingResponse' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard' || phase === 'tianXiang' || phase === 'buDaoKill' || phase === 'dyingRescue' || phase === 'selectFuChouDiscard' || huiChunAvailable) || !!fuChouTriggerPrompt || !!fuChouChoosePrompt}
              canPlayKill={canPlayKill}
              isFullHp={isFullHp}
              aoJianActive={aoJianActive}
              hasHongZhuang={hasHongZhuang}
              hasLeiInJudge={hasLeiInJudge}
              isResponse={phase === 'awaitingResponse'}
              responseType={phase === 'awaitingResponse' ? useBattleStore.getState().responseType : undefined}
              isJudgeReplace={phase === 'judgeReplace'}
              isPending={isPending}
              isLifted={isLifted}
              treasureSelectMode={phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'xiaDanPickCard'}
              selectDualMode={phase === 'selectDualCards'}
              selectDiscardMode={phase === 'selectDiscardCards' || phase === 'selectFuChouDiscard'}
              isHandCardSelect={
                phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment'
                || phase === 'xiaDanPickCard' || phase === 'selectDualCards' || phase === 'selectDiscardCards'
                || phase === 'selectFuChouDiscard' || phase === 'tianXiang' || phase === 'buDaoKill'
                || phase === 'dyingRescue'
                || manWuRedHeartCards.length > 0 || phase === 'chaoTuoPick'
              }
              isLuYeQiangKillCard={isLuYeQiangKillCard}
              hasValidSchemeTarget={hasValidSchemeTarget(card.name, card.suit)}
              shenTouActive={hasShenTou}
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
