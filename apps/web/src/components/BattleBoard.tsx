import { useState, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useBattleStore } from '../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'

import { HeroBattleCard } from './HeroBattleCard'
import { HandCard } from './HandCard'
import { FlyingCardOverlay } from './FlyingCardOverlay'
import { DirectionalLineOverlay } from './DirectionalLineOverlay'
import { DamageFloaterOverlay } from './DamageFloaterOverlay'
import { BattleLog } from './BattleLog'
import { SkillBar } from './battle/SkillBar'
import { BattleOverlays } from './battle/BattleOverlays'
import { FloatingPrompts } from './battle/FloatingPrompts'
import { PlayerHand } from './battle/PlayerHand'
import { PlayerHeroCard } from './battle/PlayerHeroCard'
import type { Card } from '@hero-legend/shared-types'

// 稳定的空回调, 避免每次渲染生成新箭头函数破坏 React.memo
const noop = () => {}

// 模块作用域常量样式, 避免每次渲染重建对象
const treasureBtnStyle = {
  fontSize: '12px',
  padding: '4px 10px',
  background: 'var(--bg-dark)',
  color: 'var(--text-light)',
  border: '1px solid #b8860b',
  borderRadius: '4px',
  cursor: 'pointer',
} as const

export function BattleBoard() {
  const {
    gameState, phase, playerHand, actionLog, result, equippedCards, pendingCardId, pendingCardType, selectedTargetId,
    playKill, playScheme, playSchemeSelf, confirmTarget, confirmPlay, cancelPlay, playHeal, equipCard, endPlayPhase, cancelSelection, game,
    judgeReplace, judgeCard, responsePrompt, toggleAoJian, respondWithCard,
    multiTargetCandidates, selectedTargets, toggleTarget, confirmMultiTarget, cancelMultiTarget,
    killMultiMax, killMultiRemaining, killMultiCardId, toggleKillMultiTarget, confirmKillMultiTarget, cancelKillMultiTarget,
    selectedDualCards, toggleDualCard, confirmDualCards, cancelDualCards,
    luYeQiangCandidates, luYeQiangKillCardId, selectLuYeQiangTarget, cancelLuYeQiangTarget,
    longLinTargetInfo, longLinSelectedCards, toggleLongLinCard, confirmLongLinPick, cancelLongLinPick,
    jieDaoHolders, jieDaoCandidates, selectJieDaoHolder, cancelJieDaoHolder, selectJieDaoTarget, cancelJieDaoTarget,
    tanNangCandidates, tanNangTargetInfo, selectTanNangTarget, cancelTanNangTarget, selectTanNangCard, cancelTanNangCard,
    wuguCandidates, selectWuguCard, cancelWuguPick,
    fudiTargetInfo, selectFudiTarget, cancelFudiTarget, selectFudiCard, cancelFudiCard,
    faJiaTargetInfo, selectFaJiaCard, cancelFaJiaCard,
    treasureSkill, treasurePrompt, treasureCardIds, treasureTargetIds, qiYiCardMap, yuRenCardIds,
    useTreasureSkill, pickTreasureCard, pickTreasureTarget, confirmTreasureTargets, cancelTreasureSkill, confirmYuRenCards, pickQiYiCard, confirmQiYiCards,
    qiYiDecision, qiYiStep, pickQiYiDecisionTarget, pickQiYiDecisionCard, confirmQiYiDecision, cancelQiYiDecision,
    xiaDanOpponentCard, xiaDanTargetName, pickXiaDanCard, cancelXiaDanCard, xiaDanActive, cancelXiaDan,
    xiaDanUsedThisTurn, yuRenUsedThisTurn,
    selectedDiscardCards, discardCount, toggleDiscardCard, confirmDiscardCards, cancelDiscardCards,
    baWangOptions, selectBaWangMount,
    ciKePrompt, confirmCiKe, cancelCiKe,
    yuRuYiPrompt, confirmYuRuYi, cancelYuRuYi,
    dieHunPrompt, confirmDieHun, cancelDieHun,
    manWuPrompt, manWuRedHeartCards, manWuSelectedCardId, selectManWuCard, selectManWuTarget, confirmManWuCard, cancelManWu,
    tianXiangJudgeCard, tianXiangEquipment, selectTianXiangCard,
    menShenCandidates, selectMenShenTarget, cancelMenShenTarget,
    jueBieCandidates, selectJueBieTarget, cancelJueBieTarget,
    zhenShaPrompt, confirmZhenSha, cancelZhenSha,
    buDaoPrompt, selectBuDaoCard,
    sanBanFuPrompt, confirmSanBanFu, cancelSanBanFu,
    fuChouTriggerPrompt, confirmFuChouTrigger, cancelFuChouTrigger,
    fuChouChoosePrompt, confirmFuChouChoose,
    fuChouPickSelected, toggleFuChouPick, confirmFuChouPick,
    dyingRescuePrompt, dyingRescueSelected, toggleDyingRescueCard, confirmDyingRescue, cancelDyingRescue,
    chaoTuoPrompt, selectChaoTuoCard,
    houZhuPrompt, selectHouZhuTarget,
    huiChunHeal,
    lastJudgeResult,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, playerHand: s.playerHand, actionLog: s.actionLog, result: s.result, equippedCards: s.equippedCards, pendingCardId: s.pendingCardId, pendingCardType: s.pendingCardType, selectedTargetId: s.selectedTargetId,
    playKill: s.playKill, playScheme: s.playScheme, playSchemeSelf: s.playSchemeSelf, confirmTarget: s.confirmTarget, confirmPlay: s.confirmPlay, cancelPlay: s.cancelPlay, playHeal: s.playHeal, equipCard: s.equipCard, endPlayPhase: s.endPlayPhase, cancelSelection: s.cancelSelection, game: s.game,
    judgeReplace: s.judgeReplace, judgeCard: s.judgeCard, responsePrompt: s.responsePrompt, toggleAoJian: s.toggleAoJian, respondWithCard: s.respondWithCard,
    multiTargetCandidates: s.multiTargetCandidates, selectedTargets: s.selectedTargets, toggleTarget: s.toggleTarget, confirmMultiTarget: s.confirmMultiTarget, cancelMultiTarget: s.cancelMultiTarget,
    killMultiMax: s.killMultiMax, killMultiRemaining: s.killMultiRemaining, killMultiCardId: s.killMultiCardId, toggleKillMultiTarget: s.toggleKillMultiTarget, confirmKillMultiTarget: s.confirmKillMultiTarget, cancelKillMultiTarget: s.cancelKillMultiTarget,
    selectedDualCards: s.selectedDualCards, toggleDualCard: s.toggleDualCard, confirmDualCards: s.confirmDualCards, cancelDualCards: s.cancelDualCards,
    luYeQiangCandidates: s.luYeQiangCandidates, luYeQiangKillCardId: s.luYeQiangKillCardId, selectLuYeQiangTarget: s.selectLuYeQiangTarget, cancelLuYeQiangTarget: s.cancelLuYeQiangTarget,
    longLinTargetInfo: s.longLinTargetInfo, longLinSelectedCards: s.longLinSelectedCards, toggleLongLinCard: s.toggleLongLinCard, confirmLongLinPick: s.confirmLongLinPick, cancelLongLinPick: s.cancelLongLinPick,
    jieDaoHolders: s.jieDaoHolders, jieDaoCandidates: s.jieDaoCandidates, selectJieDaoHolder: s.selectJieDaoHolder, cancelJieDaoHolder: s.cancelJieDaoHolder, selectJieDaoTarget: s.selectJieDaoTarget, cancelJieDaoTarget: s.cancelJieDaoTarget,
    tanNangCandidates: s.tanNangCandidates, tanNangTargetInfo: s.tanNangTargetInfo, selectTanNangTarget: s.selectTanNangTarget, cancelTanNangTarget: s.cancelTanNangTarget, selectTanNangCard: s.selectTanNangCard, cancelTanNangCard: s.cancelTanNangCard,
    wuguCandidates: s.wuguCandidates, selectWuguCard: s.selectWuguCard, cancelWuguPick: s.cancelWuguPick,
    fudiTargetInfo: s.fudiTargetInfo, selectFudiTarget: s.selectFudiTarget, cancelFudiTarget: s.cancelFudiTarget, selectFudiCard: s.selectFudiCard, cancelFudiCard: s.cancelFudiCard,
    faJiaTargetInfo: s.faJiaTargetInfo, selectFaJiaCard: s.selectFaJiaCard, cancelFaJiaCard: s.cancelFaJiaCard,
    treasureSkill: s.treasureSkill, treasurePrompt: s.treasurePrompt, treasureCardIds: s.treasureCardIds, treasureTargetIds: s.treasureTargetIds, qiYiCardMap: s.qiYiCardMap, yuRenCardIds: s.yuRenCardIds,
    useTreasureSkill: s.useTreasureSkill, pickTreasureCard: s.pickTreasureCard, pickTreasureTarget: s.pickTreasureTarget, confirmTreasureTargets: s.confirmTreasureTargets, cancelTreasureSkill: s.cancelTreasureSkill, confirmYuRenCards: s.confirmYuRenCards, pickQiYiCard: s.pickQiYiCard, confirmQiYiCards: s.confirmQiYiCards,
    qiYiDecision: s.qiYiDecision, qiYiStep: s.qiYiStep, pickQiYiDecisionTarget: s.pickQiYiDecisionTarget, pickQiYiDecisionCard: s.pickQiYiDecisionCard, confirmQiYiDecision: s.confirmQiYiDecision, cancelQiYiDecision: s.cancelQiYiDecision,
    xiaDanOpponentCard: s.xiaDanOpponentCard, xiaDanTargetName: s.xiaDanTargetName, pickXiaDanCard: s.pickXiaDanCard, cancelXiaDanCard: s.cancelXiaDanCard, xiaDanActive: s.xiaDanActive, cancelXiaDan: s.cancelXiaDan,
    xiaDanUsedThisTurn: s.xiaDanUsedThisTurn, yuRenUsedThisTurn: s.yuRenUsedThisTurn,
    selectedDiscardCards: s.selectedDiscardCards, discardCount: s.discardCount, toggleDiscardCard: s.toggleDiscardCard, confirmDiscardCards: s.confirmDiscardCards, cancelDiscardCards: s.cancelDiscardCards,
    baWangOptions: s.baWangOptions, selectBaWangMount: s.selectBaWangMount,
    ciKePrompt: s.ciKePrompt, confirmCiKe: s.confirmCiKe, cancelCiKe: s.cancelCiKe,
    yuRuYiPrompt: s.yuRuYiPrompt, confirmYuRuYi: s.confirmYuRuYi, cancelYuRuYi: s.cancelYuRuYi,
    dieHunPrompt: s.dieHunPrompt, confirmDieHun: s.confirmDieHun, cancelDieHun: s.cancelDieHun,
    manWuPrompt: s.manWuPrompt, manWuRedHeartCards: s.manWuRedHeartCards, manWuSelectedCardId: s.manWuSelectedCardId, selectManWuCard: s.selectManWuCard, selectManWuTarget: s.selectManWuTarget, confirmManWuCard: s.confirmManWuCard, cancelManWu: s.cancelManWu,
    tianXiangJudgeCard: s.tianXiangJudgeCard, tianXiangEquipment: s.tianXiangEquipment, selectTianXiangCard: s.selectTianXiangCard,
    menShenCandidates: s.menShenCandidates, selectMenShenTarget: s.selectMenShenTarget, cancelMenShenTarget: s.cancelMenShenTarget,
    jueBieCandidates: s.jueBieCandidates, selectJueBieTarget: s.selectJueBieTarget, cancelJueBieTarget: s.cancelJueBieTarget,
    zhenShaPrompt: s.zhenShaPrompt, confirmZhenSha: s.confirmZhenSha, cancelZhenSha: s.cancelZhenSha,
    buDaoPrompt: s.buDaoPrompt, selectBuDaoCard: s.selectBuDaoCard,
    sanBanFuPrompt: s.sanBanFuPrompt, confirmSanBanFu: s.confirmSanBanFu, cancelSanBanFu: s.cancelSanBanFu,
    fuChouTriggerPrompt: s.fuChouTriggerPrompt, confirmFuChouTrigger: s.confirmFuChouTrigger, cancelFuChouTrigger: s.cancelFuChouTrigger,
    fuChouChoosePrompt: s.fuChouChoosePrompt, confirmFuChouChoose: s.confirmFuChouChoose,
    fuChouPickSelected: s.fuChouPickSelected, toggleFuChouPick: s.toggleFuChouPick, confirmFuChouPick: s.confirmFuChouPick,
    dyingRescuePrompt: s.dyingRescuePrompt, dyingRescueSelected: s.dyingRescueSelected, toggleDyingRescueCard: s.toggleDyingRescueCard, confirmDyingRescue: s.confirmDyingRescue, cancelDyingRescue: s.cancelDyingRescue,
    chaoTuoPrompt: s.chaoTuoPrompt, selectChaoTuoCard: s.selectChaoTuoCard,
    houZhuPrompt: s.houZhuPrompt, selectHouZhuTarget: s.selectHouZhuTarget,
    huiChunHeal: s.huiChunHeal,
    lastJudgeResult: s.lastJudgeResult,
  })))

  // 濒死救援目标 id (用于在 HeroBattleCard 上区分 isDying vs isDead)
  const dyingTargetId = useBattleStore(s => s.dyingRescuePrompt?.targetId ?? null)


  // 角色排布派生值 — 用 useMemo 稳定引用, 让 HeroBattleCard 的 React.memo 真正生效
  // 注意: 必须放在 early return 之前 (hooks 规则)
  const { enemies, allies, player, others, otherPositions } = useMemo(() => {
    const enemies = gameState?.heroes.filter(h => h.role === 'enemy') ?? []
    const allies = gameState?.heroes.filter(h => h.role === 'ally') ?? []
    const player = gameState?.heroes.find(h => h.role === 'player')

    // 角色排布 (与引擎座位顺序一致 [player, allies..., enemies...], 距离按座位计算):
    // - 玩家在左下 (在下方独立面板里, 由外层 div 控制)
    // - others = [...allies, ...enemies] — 与引擎 seating 顺序一致
    // - others[0] = 玩家右侧邻位 (seating idx 1, 距离1)
    //   others[others.length-1] = 玩家左侧邻位 (seating idx n-1, 距离1)
    // - 排布规则:
    //   - 1个: 顶部居中
    //   - 2个: 中部左右 (都是距离1)
    //   - ≥3个: 中部左 + 顶部 (N-2) 水平均布 + 中部右
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
      const positions: CSSProperties[] = [
        { left: '8px', top: '50%' },
      ]
      for (let i = 0; i < topCount; i++) {
        const leftPct = 5 + (i + 0.5) * (90 / topCount)
        positions.push({ left: `${leftPct}%`, top: '8px' })
      }
      positions.push({ right: '8px', top: '50%' })
      otherPositions = positions
    }
    return { enemies, allies, player, others, otherPositions }
  }, [gameState])

  if (!gameState) return null

  // pending 状态下, 杀/锦囊目标可选 (但不直接commit, 仅高亮)
  const isPendingTargeting = phase === 'playing' && pendingCardId !== null && (pendingCardType === 'kill' || pendingCardType === 'scheme')
  // pending 状态下, 其他目标应加阴影显示 (dimInvalidTargets)
  const shouldDimInvalidTargets = isPendingTargeting

  // 是否有任何询问/响应提示横幅 — 用于决定技能栏是否需要显示 + 加遮罩
  const hasFloatingPrompt = (phase === 'playing' && pendingCardId && pendingCardType)
    || phase === 'selectFuChouDiscard'
    || phase === 'judgeReplace'
    || phase === 'awaitingResponse'
    || xiaDanActive
    || treasureSkill === 'yu-ren'
    || treasureSkill === 'feng-huo'
    || (treasureSkill === 'jue-ji' && phase === 'treasureSelectWeapon')
    || phase === 'xiaDanPickCard'
    || !!ciKePrompt
    || !!yuRuYiPrompt
    || !!dieHunPrompt
    || manWuRedHeartCards.length > 0
    || !!manWuPrompt
    || (phase === 'tianXiang' && (tianXiangEquipment.length > 0 || !!tianXiangJudgeCard))
    || phase === 'menShenTarget'
    || phase === 'jueBieTarget'
    || !!zhenShaPrompt
    || !!sanBanFuPrompt
    || !!fuChouTriggerPrompt
    || !!fuChouChoosePrompt
    || (phase === 'buDaoKill' && !!buDaoPrompt)
    || phase === 'chaoTuoPick'
    || phase === 'houZhuTarget'
    || (phase === 'dyingRescue' && !!dyingRescuePrompt)
    || phase === 'selectDualCards'
    || phase === 'selectMultiTargets'
    || phase === 'selectKillMultiTargets'
    || (phase === 'qiYiPrompt' && !!qiYiDecision)

  // 弹框类 (釜底抽薪/探囊取物/五谷丰登/发甲...) — 技能栏仍要显示+遮罩 (但不渲染浮动提示横幅)
  const hasPlayerBarMask = phase === 'selectFudiCard'
    || phase === 'selectFudiTarget'
    || phase === 'selectTanNangCard'
    || phase === 'selectTanNangTarget'
    || phase === 'selectWugu'
    || phase === 'selectFaJiaCard'
    || phase === 'selectLuYeQiangTarget'
    || phase === 'qiYiPrompt'

  // 渲染一个非玩家英雄卡 (敌方/友方通用, 含可点击/选中/AI回合高亮)
  const renderOtherHeroCard = (h: typeof others[0], dimInvalidTargets?: boolean) => {
    const isDying = h.currentHp === 0 && dyingTargetId === h.hero.id
    const isDead  = h.currentHp <= 0 && !isDying
    return (
    <HeroBattleCard
      key={h.hero.id}
      hero={h}
      isCurrentTurn={gameState.currentHeroId === h.hero.id && !isPlayerTurn}
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
      dimmed={(!!dimInvalidTargets && !isValidTarget(h.hero.id)) || (shouldDimInvalidTargets && !isValidTarget(h.hero.id))}
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
          } else if (t.length < 2 && h.hero.id !== player?.hero.id) {
            useBattleStore.setState({ treasureTargetIds: [...t, h.hero.id] })
          }
        }
      }}
    />
    )
  }

  // 始终从引擎读取傲剑激活状态 (store 的状态可能与引擎不同步)
  const aoJianActive = game?.isAoJianActive(player?.hero?.id ?? '') ?? false

  // 选目标阶段: 判断某英雄是否合法目标 (用于高亮可杀/可探囊的目标, 其他玩家变暗)
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
    // pending 状态: 杀/锦囊的目标校验 (phase='playing' + pendingCardId)
    const inPendingSelect = phase === 'playing' && pendingCardId !== null
    if (inPendingSelect && pendingCardType === 'kill') {
      return game.isInAttackRange(attacker, target)
    }
    // 借刀杀人 step 1: 选持武器玩家
    if (inPendingSelect && pendingCardType === 'scheme' && pendingSchemeName === '借刀杀人' && jieDaoCandidates.length === 0) {
      if (jieDaoHolders.length === 0) return false
      return jieDaoHolders.some(h => h.id === heroId)
    }
    // 借刀杀人 step 2: 选攻击目标 (在holder攻击范围内)
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
    // 兼容旧 phase='selectTarget' (用于其他选择)
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
      // 绝击: 只允许攻击范围内的敌方
      const tSkill = useBattleStore.getState().treasureSkill
      if (tSkill === 'jue-ji') return game.isInAttackRange(attacker, target)
    }
    if (phase === 'selectFudiTarget') {
      // 釜底抽薪: 目标必须有牌可弃 (手牌/装备/判定)
      const hasAny = target.getHandSize() > 0 || game.collectEquipmentCards(target).length > 0 || target.getJudgeCards().length > 0
      return hasAny
    }
    return true
  }
  // 选目标阶段是否应启用 dim 效果 (出杀/锦囊)
  const dimInvalidTargets = !!(game && player && (
    (phase === 'selectTarget' && (pendingCardType === 'kill' || (pendingCardType === 'scheme' && pendingSchemeName === '探囊取物'))) ||
    (phase === 'treasureSelectTarget' && useBattleStore.getState().treasureSkill === 'jue-ji') ||
    (phase === 'selectFudiTarget')
  ))

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const canPlayKill = game?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true

  // 技能栏是否加遮罩 (默认 = !isPlayerTurn || hasFloatingPrompt || hasPlayerBarMask)
  // 例外: 决斗/闪/无懈可击的响应提示时, 技能栏仍可操作, 不加遮罩
  const shouldMaskSkillBar = phase !== 'awaitingResponse' && (!isPlayerTurn || hasFloatingPrompt || hasPlayerBarMask)

  // 校验某张锦囊牌是否当前有合法目标 (用于禁用 探囊/釜底/借刀 等需选目标的牌)
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

  const playerHero = player?.instance
  const allSkills = player?.hero.skills ?? []
  // 玩家判定区是否有手捧雷 — 该雷存在时手捧雷不可主动使用
  const hasLeiInJudge = player?.judgeCards?.some(cid => {
    const c = game?.getPlayerById(player.hero.id)?.getJudgeCards()?.find((x: Card) => x.id === cid)
    return c?.name === '手捧雷'
  }) ?? false
  const allTreasures = [
    ...(playerHero?.treasures?.main ?? []),
    ...(playerHero?.treasures?.sub ?? []),
  ].filter(Boolean)
  const hasSkillOrTreasure = (id: string) =>
    allSkills.some(s => s.id === id) || allTreasures.some(t => t?.skill.id === id || t?.skill.id === `treasure-${id}`)

  const hasAoJian = hasSkillOrTreasure('ao-jian')
  const hasHongZhuang = hasSkillOrTreasure('hong-zhuang')
  const hasLiaoShang = hasSkillOrTreasure('liao-shang')
  const hasZhiYu = hasSkillOrTreasure('zhi-yu')
  const hasFengHuo = hasSkillOrTreasure('feng-huo')
  const hasYuRen = hasSkillOrTreasure('yu-ren')
  const hasShiQuan = hasSkillOrTreasure('shi-quan')
  const hasJueJi = hasSkillOrTreasure('jue-ji')
  const hasQiYi = hasSkillOrTreasure('qi-yi')
  const hasXiaDan = hasSkillOrTreasure('xia-dan')
  const hasHuiChun = hasSkillOrTreasure('hui-chun')
  // 回春: 扁鹊回合外, 红桃手牌/装备当药, 仅自己不满血时可用
  const huiChunAvailable = hasHuiChun && !isPlayerTurn && !isFullHp
  // 当前玩家装备的武器名
  const playerWeaponName = (() => {
    const weaponId = player?.equipment?.weapon
    if (!weaponId) return undefined
    // 从store里查
    const equipped = useBattleStore.getState().equippedCards[player?.hero.id ?? '']?.weapon
    return equipped?.name
  })()

  // 绝击本回合已用次数
  const jueJiUsedThisTurn = (() => {
    const g = useBattleStore.getState().game
    const p = g?.getPlayer()
    return p ? p.getSkillUseCount('jue-ji') : 0
  })()

  return (
    <div style={{ display: 'flex', gap: '8px', height: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
      {/* 左侧: 战斗信息 (战报) */}
      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BattleLog logs={actionLog} />
      </div>
      {/* 右侧: 战场 + 玩家区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, minHeight: 0 }}>
      {/* Battle field: 顶部战场, 其他角色按逆时针分布在玩家周围 */}
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: 'var(--bg-dark)', border: '1px solid var(--border-wood)', borderRadius: '8px', padding: '8px', overflow: 'hidden' }}>
        {/* 顶部提示 (悬浮在战场上方, 不阻挡角色) — 选单目标提示 */}
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

        {/* 其他角色: 按数量排布 (顶部 + 中部左右) */}
        {others.map((h, i) => (
          <div key={h.hero.id} style={{ position: 'absolute', zIndex: 2, ...otherPositions[i] }}>
            {renderOtherHeroCard(h, isPendingTargeting || dimInvalidTargets)}
          </div>
        ))}
      </div>

      {/* Player area (玩家本人永远在左下角) */}
      {player && (
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

          {/* 布局: 玩家卡(左侧上下占满) | 手牌 + 技能按钮行 (提示已上移到浮动容器) */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            {/* 左侧: 玩家卡 (上下占满) */}
            <PlayerHeroCard />

            {/* 右侧: 手牌 + 技能按钮行 (提示已移到上方浮动容器) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '6px' }}>
          {/* Hand cards — 数量多时扑克牌式叠放, 否则正常并排 */}
          <PlayerHand />

            {/* 技能按钮行: 主动技能 + 宝具技能 + 傲剑 + 芦叶枪 + 结束出牌 (有询问提示/弹框时也显示, 加遮罩禁止操作) */}
            <SkillBar />
            </div>

          </div>
        </div>
      )}

      <BattleOverlays />
      {/* 中心 marker: 飞行卡的中心点定位参考 (1x1 不可见) */}
      <div data-center-marker style={{ position: 'fixed', top: '50%', left: '50%', width: '1px', height: '1px', pointerEvents: 'none', zIndex: -1 }} />
      {/* 飞行卡浮层: Portal 到 body, zIndex 2000 */}
      <FlyingCardOverlay />
      <DirectionalLineOverlay />
      <DamageFloaterOverlay />
      </div>
    </div>
  )
}
