import { useEffect, useMemo, useState } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'
import { HandCard } from '../HandCard'
import type { Card } from '@hero-legend/shared-types'

const noop = () => {}

const treasureBtnStyle = {
  fontSize: '12px',
  padding: '4px 10px',
  background: 'var(--bg-dark)',
  color: 'var(--text-light)',
  border: '1px solid #b8860b',
  borderRadius: '4px',
  cursor: 'pointer',
} as const

export function FloatingPrompts() {
  const {
    gameState, phase, playerHand, equippedCards, pendingCardId, pendingCardType,
    selectedTargetId, selectedTargets,
    derived,
    responsePrompt,
    killMultiMax,
    treasureSkill, treasureCardIds, treasureTargetIds, qiYiCardMap,
    qiYiDecision, qiYiStep,
    luYeQiangKillCardId,
    manWuPrompt, manWuRedHeartCards, manWuSelectedCardId,
    tianXiangJudgeCard, tianXiangEquipment,
    menShenCandidates, jueBieCandidates,
    shenTouActive,
    zhenShaPrompt, buDaoPrompt, sanBanFuPrompt, panLongGunPrompt,
    buDao3TriggerPrompt,
    fuChouTriggerPrompt, fuChouChoosePrompt, fuChouPickSelected,
    sheShenTriggerPrompt,
    dyingRescuePrompt,
    chaoTuoPrompt, houZhuPrompt,
    ciKePrompt, qiangLuePrompt, yuRuYiPrompt, dieHunPrompt,
    xiaDanActive, xiaDanTargetName,
    yuRenCardIds,
    selectedDualCards,
    shuCaiActive, shuCaiSelectedCardIds, shuCaiTargetId,
    confirmShuCai, deactivateShuCai,
    confirmPlay, cancelPlay,
    judgeCard, respondWithCard, cancelXiaDan,
    confirmDualCards, cancelDualCards,
    confirmMultiTarget, cancelMultiTarget,
    confirmKillMultiTarget, cancelLuYeQiangTarget,
    toggleKillMultiTarget, cancelKillMultiTarget,
    confirmCiKe, cancelCiKe,
    confirmQiangLue, cancelQiangLue,
    confirmYuRuYi, cancelYuRuYi,
    confirmDieHun, cancelDieHun,
    selectManWuCard, selectManWuTarget, confirmManWuCard, cancelManWu,
    selectTianXiangCard,
    confirmMenShen, cancelMenShenConfirm,
    selectMenShenTarget, cancelMenShenTarget,
    selectJueBieTarget, cancelJueBieTarget,
    confirmZhenSha, cancelZhenSha,
    selectBuDaoCard,
    confirmBuDao3Trigger, cancelBuDao3Trigger,
    confirmSanBanFu, cancelSanBanFu,
    confirmPanLongGun, cancelPanLongGun,
    confirmFuChouTrigger, cancelFuChouTrigger,
    confirmSheShenTrigger,
    confirmFuChouChoose,
    toggleFuChouPick, confirmFuChouPick,
    cancelDyingRescue,
    selectChaoTuoCard,
    selectHouZhuTarget,
    pickXiaDanCard, cancelXiaDanCard,
    pickQiYiDecisionTarget, pickQiYiDecisionCard, confirmQiYiDecision, cancelQiYiDecision,
    pickTreasureCard, confirmTreasureTargets, cancelTreasureSkill, confirmYuRenCards, pickQiYiCard, cancelQiYiCards,
    toggleDiscardCard, confirmDiscardCards, cancelDiscardCards,
    discardCount, selectedDiscardCards,
    playerJueJiSelf,
  } = useBattleStore(useShallow(s => ({
    gameState: s.gameState, phase: s.phase, playerHand: s.playerHand, equippedCards: s.equippedCards, pendingCardId: s.pendingCardId, pendingCardType: s.pendingCardType,
    selectedTargetId: s.selectedTargetId, selectedTargets: s.selectedTargets, derived: s.derived,
    responsePrompt: s.responsePrompt,
    killMultiMax: s.killMultiMax,
    treasureSkill: s.treasureSkill, treasureCardIds: s.treasureCardIds, treasureTargetIds: s.treasureTargetIds, qiYiCardMap: s.qiYiCardMap,
    qiYiDecision: s.qiYiDecision, qiYiStep: s.qiYiStep,
    luYeQiangKillCardId: s.luYeQiangKillCardId,
    manWuPrompt: s.manWuPrompt, manWuRedHeartCards: s.manWuRedHeartCards, manWuSelectedCardId: s.manWuSelectedCardId,
    tianXiangJudgeCard: s.tianXiangJudgeCard, tianXiangEquipment: s.tianXiangEquipment,
    menShenCandidates: s.menShenCandidates, jueBieCandidates: s.jueBieCandidates,
    shenTouActive: s.shenTouActive,
    zhenShaPrompt: s.zhenShaPrompt, buDaoPrompt: s.buDaoPrompt, sanBanFuPrompt: s.sanBanFuPrompt,
    buDao3TriggerPrompt: s.buDao3TriggerPrompt,
    fuChouTriggerPrompt: s.fuChouTriggerPrompt, fuChouChoosePrompt: s.fuChouChoosePrompt, fuChouPickSelected: s.fuChouPickSelected,
    sheShenTriggerPrompt: s.sheShenTriggerPrompt,
    dyingRescuePrompt: s.dyingRescuePrompt,
    chaoTuoPrompt: s.chaoTuoPrompt, houZhuPrompt: s.houZhuPrompt,
    ciKePrompt: s.ciKePrompt, qiangLuePrompt: s.qiangLuePrompt, yuRuYiPrompt: s.yuRuYiPrompt, dieHunPrompt: s.dieHunPrompt,
    xiaDanActive: s.xiaDanActive, xiaDanTargetName: s.xiaDanTargetName,
    yuRenCardIds: s.yuRenCardIds,
    selectedDualCards: s.selectedDualCards,
    shuCaiActive: s.shuCaiActive, shuCaiSelectedCardIds: s.shuCaiSelectedCardIds, shuCaiTargetId: s.shuCaiTargetId,
    confirmShuCai: s.confirmShuCai, deactivateShuCai: s.deactivateShuCai,
    confirmPlay: s.confirmPlay, cancelPlay: s.cancelPlay,
    judgeCard: s.judgeCard, respondWithCard: s.respondWithCard, cancelXiaDan: s.cancelXiaDan,
    confirmDualCards: s.confirmDualCards, cancelDualCards: s.cancelDualCards,
    confirmMultiTarget: s.confirmMultiTarget, cancelMultiTarget: s.cancelMultiTarget,
    confirmKillMultiTarget: s.confirmKillMultiTarget, cancelLuYeQiangTarget: s.cancelLuYeQiangTarget,
    toggleKillMultiTarget: s.toggleKillMultiTarget, cancelKillMultiTarget: s.cancelKillMultiTarget,
    confirmCiKe: s.confirmCiKe, cancelCiKe: s.cancelCiKe,
    confirmQiangLue: s.confirmQiangLue, cancelQiangLue: s.cancelQiangLue,
    confirmYuRuYi: s.confirmYuRuYi, cancelYuRuYi: s.cancelYuRuYi,
    confirmDieHun: s.confirmDieHun, cancelDieHun: s.cancelDieHun,
    selectManWuCard: s.selectManWuCard, selectManWuTarget: s.selectManWuTarget, confirmManWuCard: s.confirmManWuCard, cancelManWu: s.cancelManWu,
    selectTianXiangCard: s.selectTianXiangCard,
    confirmMenShen: s.confirmMenShen, cancelMenShenConfirm: s.cancelMenShenConfirm,
    selectMenShenTarget: s.selectMenShenTarget, cancelMenShenTarget: s.cancelMenShenTarget,
    selectJueBieTarget: s.selectJueBieTarget, cancelJueBieTarget: s.cancelJueBieTarget,
    confirmZhenSha: s.confirmZhenSha, cancelZhenSha: s.cancelZhenSha,
    selectBuDaoCard: s.selectBuDaoCard,
    confirmBuDao3Trigger: s.confirmBuDao3Trigger, cancelBuDao3Trigger: s.cancelBuDao3Trigger,
    confirmSanBanFu: s.confirmSanBanFu, cancelSanBanFu: s.cancelSanBanFu,
    confirmPanLongGun: s.confirmPanLongGun, cancelPanLongGun: s.cancelPanLongGun,
    panLongGunPrompt: s.panLongGunPrompt,
    confirmFuChouTrigger: s.confirmFuChouTrigger, cancelFuChouTrigger: s.cancelFuChouTrigger,
    confirmSheShenTrigger: s.confirmSheShenTrigger,
    confirmFuChouChoose: s.confirmFuChouChoose,
    toggleFuChouPick: s.toggleFuChouPick, confirmFuChouPick: s.confirmFuChouPick,
    cancelDyingRescue: s.cancelDyingRescue,
    selectChaoTuoCard: s.selectChaoTuoCard,
    selectHouZhuTarget: s.selectHouZhuTarget,
    pickXiaDanCard: s.pickXiaDanCard, cancelXiaDanCard: s.cancelXiaDanCard,
    pickQiYiDecisionTarget: s.pickQiYiDecisionTarget, pickQiYiDecisionCard: s.pickQiYiDecisionCard, confirmQiYiDecision: s.confirmQiYiDecision, cancelQiYiDecision: s.cancelQiYiDecision,
    pickTreasureCard: s.pickTreasureCard, confirmTreasureTargets: s.confirmTreasureTargets, cancelTreasureSkill: s.cancelTreasureSkill, confirmYuRenCards: s.confirmYuRenCards, pickQiYiCard: s.pickQiYiCard, cancelQiYiCards: s.cancelQiYiCards,
    toggleDiscardCard: s.toggleDiscardCard, confirmDiscardCards: s.confirmDiscardCards, cancelDiscardCards: s.cancelDiscardCards,
    discardCount: s.discardCount, selectedDiscardCards: s.selectedDiscardCards,
    playerJueJiSelf: s.playerJueJiSelf,
  })))

  const player = useMemo(() => gameState?.heroes.find(h => h.role === 'player'), [gameState])
  const dyingTargetId = useBattleStore(s => s.dyingRescuePrompt?.targetId ?? null)
  const aoJianActive = derived?.aoJianActive ?? false

  const hasFloatingPrompt = useMemo(() =>
    (phase === 'playing' && !!pendingCardId && !!pendingCardType)
    || phase === 'selectFuChouDiscard'
    || phase === 'judgeReplace'
    || phase === 'awaitingResponse'
    || xiaDanActive
    || treasureSkill === 'yu-ren'
    || treasureSkill === 'liao-shang'
    || treasureSkill === 'zhi-yu'
    || treasureSkill === 'feng-huo'
    || (treasureSkill === 'jue-ji' && phase === 'treasureSelectWeapon')
    || phase === 'xiaDanPickCard'
    || !!ciKePrompt
    || !!qiangLuePrompt
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
    || !!sheShenTriggerPrompt
    || !!panLongGunPrompt
    || (phase === 'buDaoKill' && !!buDaoPrompt)
    || (phase === 'buDao3Trigger' && !!buDao3TriggerPrompt)
    || phase === 'chaoTuoPick'
    || phase === 'houZhuTarget'
    || (phase === 'dyingRescue' && !!dyingRescuePrompt)
    || phase === 'selectDualCards'
    || phase === 'selectMultiTargets'
    || phase === 'selectKillMultiTargets'
    || (phase === 'qiYiPrompt' && !!qiYiDecision)
    || shuCaiActive
  , [phase, pendingCardId, pendingCardType, xiaDanActive, treasureSkill, ciKePrompt, qiangLuePrompt, yuRuYiPrompt, dieHunPrompt, manWuRedHeartCards, manWuPrompt, tianXiangEquipment, tianXiangJudgeCard, zhenShaPrompt, sanBanFuPrompt, fuChouTriggerPrompt, fuChouChoosePrompt, sheShenTriggerPrompt, buDaoPrompt, buDao3TriggerPrompt, dyingRescuePrompt, qiYiDecision, panLongGunPrompt, shuCaiActive])

  const killMultiCardId = useBattleStore(s => s.killMultiCardId)
  const [wolfFangPromptRect, setWolfFangPromptRect] = useState<{ left: number; top: number; width: number } | null>(null)
  useEffect(() => {
    if (phase !== 'selectKillMultiTargets' || !killMultiCardId) {
      setWolfFangPromptRect(null)
      return
    }
    const update = () => {
      const el = document.querySelector(`[data-card-id="${killMultiCardId}"]`) as HTMLElement | null
      if (!el) {
        setWolfFangPromptRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setWolfFangPromptRect({ left: r.left, top: r.top, width: r.width })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [phase, killMultiCardId])

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const canPlayKill = derived?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true

  return (
    <>
          {hasFloatingPrompt && (
            <div style={{
              position: 'absolute',
              bottom: '104%',
              left: 0,
              right: 0,
              marginBottom: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 10,
              pointerEvents: 'none',
            }}>
              {/* 1. Pending出牌提示横幅 */}
              {phase === 'playing' && pendingCardId && pendingCardType && (() => {
                const isJieDaoStep2 = pendingCardId === '__jieDaoStep2__'
                // 傲剑: 装备区红色牌也可当杀, 需在装备区查 pendingCardId
                const playerEquipped = equippedCards[player?.hero.id ?? ''] ?? {}
                const pendingCard = isJieDaoStep2
                  ? { id: '__jieDaoStep2__', name: '借刀杀人', suit: 'spade', type: 'scheme', description: 'step 2' } as any
                  : playerHand.find(c => c.id === pendingCardId)
                    ?? playerEquipped.weapon
                    ?? playerEquipped.armor
                    ?? playerEquipped.attackMount
                    ?? playerEquipped.defenseMount
                    ?? null
                if (!pendingCard) return null
                // 傲剑下非杀牌当杀: 显示杀的信息, 不显示原牌信息
                const isAoJianKill = pendingCardType === 'kill' && pendingCard.name !== '杀' && aoJianActive
                // 神偷激活: ♣非探囊手牌一律当探囊取物, 显示用探囊取物信息
                const isShenTouTanNang = pendingCardType === 'scheme' && shenTouActive && pendingCard.suit === 'club' && pendingCard.name !== '探囊取物'
                const displayName = isAoJianKill
                  ? `杀·当杀(${pendingCard.name})`
                  : isShenTouTanNang
                    ? `探囊取物·神偷(${pendingCard.name})`
                    : pendingCard.name
                const descMap: Record<string, string> = {
                  '杀': '对攻击范围内的1名其他角色使用, 造成1点伤害',
                  '药': '立即回复1点体力 (满血时不可使用)',
                  '闪': '响应【杀】时使用, 抵消伤害',
                  '无懈可击': '抵消1张【杀】或锦囊对其目标的效果',
                  '无中生有': '立即从牌堆摸2张牌',
                  '决斗': '与1名其他角色拼点, 输的一方受到1点伤害',
                  '万箭齐发': '除你以外的所有其他角色须各打出1张【闪】, 否则受到你1点伤害',
                  '烽火狼烟': '除你以外的所有其他角色须各打出1张【杀】, 否则受到你1点伤害',
                  '五谷丰登': '亮出牌堆顶8张牌, 所有角色依次拿取其中1张',
                  '探囊取物': '获得攻击范围内1名其他角色的1张手牌/判定/装备',
                  '釜底抽薪': '弃任意1名其他角色的1张手牌/判定/装备 (无距离限制)',
                  '借刀杀人': isJieDaoStep2
                    ? '选择被借刀玩家的攻击目标 (在holder攻击范围内)'
                    : '选择1名装备武器的其他角色, 该角色需对其攻击范围内的另一名角色使用【杀】',
                  '手捧雷': '延时锦囊, 判定非♠2-9则目标受到2点雷电伤害',
                  '画地为牢': '延时锦囊, 判定非♥则目标跳过下回合出牌阶段',
                  '休养生息': '立即回复1点体力',
                }
                const descKey = isAoJianKill ? '杀' : isShenTouTanNang ? '探囊取物' : pendingCard.name
                const desc = descMap[descKey] ?? (pendingCard as any).description ?? '该牌的特殊效果'
                const needTarget = pendingCardType === 'kill' || pendingCardType === 'scheme'
                const selectedTargetName = selectedTargetId ? (gameState?.heroes.find(h => h.hero.id === selectedTargetId)?.hero.name ?? '') : ''
                const canConfirm = !needTarget || !!selectedTargetId
                const confirmLabel = needTarget
                  ? (selectedTargetId ? `确定 → ${selectedTargetName}` : '请先选择目标')
                  : `确定使用【${displayName}】`
                const suitColor = pendingCard.suit === 'heart' || pendingCard.suit === 'diamond' ? '#e57373' : 'var(--text-light)'
                return (
                  <div style={{
                    pointerEvents: 'auto',
                    width: '70%',
                    margin: '0 auto',
                    padding: '5px 8px',
                    background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                    borderRadius: '6px',
                    border: '2px solid #ffd54f',
                    color: '#ffd54f', fontSize: '13px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                  }}>
                    <span style={{ flex: 1 }}>
                      🎯 <b style={{ color: suitColor, fontSize: '14px' }}>【{displayName}】{isJieDaoStep2 ? '·二阶段' : ''}</b> {desc}
                      {needTarget && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                          {selectedTargetId ? `(已选目标: ${selectedTargetName})` : '(请点击场上角色选择目标)'}
                        </span>
                      )}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={treasureBtnStyle} onClick={cancelPlay}>取消</button>
                      <button
                        className="primary"
                        style={{ ...treasureBtnStyle, opacity: canConfirm ? 1 : 0.5 }}
                        disabled={!canConfirm}
                        onClick={confirmPlay}
                      >
                        {confirmLabel}
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* 2. 复仇弃牌横幅 */}
              {phase === 'selectFuChouDiscard' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(244,67,54,0.18), rgba(183,28,28,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ef5350',
                  color: '#ef9a9a', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(244,67,54,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    🗡️ <b style={{ fontSize: '14px' }}>复仇弃牌</b> — 请从手牌中选2张弃掉 (已选 {fuChouPickSelected.length}/2)
                  </span>
                  <button
                    style={{ ...treasureBtnStyle, opacity: fuChouPickSelected.length < 2 ? 0.5 : 1 }}
                    className="primary"
                    disabled={fuChouPickSelected.length < 2}
                    onClick={confirmFuChouPick}
                  >
                    确认弃{fuChouPickSelected.length}张
                  </button>
                </div>
              )}

              {/* 3. 判定牌替换提示 */}
              {phase === 'judgeReplace' && judgeCard && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(100,181,246,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(100,181,246,0.3)',
                  color: '#90caf9', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>🔄 判定牌: {judgeCard.name} ({judgeCard.suit === 'heart' ? '♥' : judgeCard.suit === 'diamond' ? '♦' : judgeCard.suit === 'spade' ? '♠' : '♣'}{judgeCard.number === 1 ? 'A' : judgeCard.number > 10 ? ['J','Q','K'][judgeCard.number - 11] : judgeCard.number})
                    {' — '}弃一张手牌可替换此判定牌</span>
                </div>
              )}

              {/* 4. 响应提示: 决斗/南蛮/万箭/烽火/杀/闪 */}
              {phase === 'awaitingResponse' && responsePrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,152,0,0.18), rgba(230,81,0,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffb74d',
                  color: '#ffb74d', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,152,0,0.4)',
                }}>
                  <span style={{ flex: 1 }}>⚡ {responsePrompt}</span>
                  <button style={treasureBtnStyle} onClick={() => respondWithCard(null)}>放弃</button>
                </div>
              )}

              {/* 5. 侠胆激活 — 选有手牌的角色拼点 */}
              {xiaDanActive && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>🗡️ 侠胆待选目标 — 点击1名<b>有手牌</b>的角色开始拼点</span>
                  <button style={treasureBtnStyle} onClick={cancelXiaDan}>取消</button>
                </div>
              )}

              {/* 6. 驭人选牌 */}
              {treasureSkill === 'yu-ren' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>🎴 驭人选牌 — 点击手牌切换选中, 已选 <b>{yuRenCardIds.length}</b> 张</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelTreasureSkill}>取消</button>
                    <button
                      className="primary"
                      style={treasureBtnStyle}
                      disabled={yuRenCardIds.length === 0}
                      onClick={confirmYuRenCards}
                    >
                      确认驭人
                    </button>
                  </div>
                </div>
              )}

              {/* 6b. 疗伤选牌 */}
              {treasureSkill === 'liao-shang' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>💊 疗伤选牌 — 点击1张手牌弃置, 再选1名不满血的角色回复1血</span>
                  <button style={treasureBtnStyle} onClick={cancelTreasureSkill}>取消</button>
                </div>
              )}

              {/* 6c. 治愈选牌 */}
              {treasureSkill === 'zhi-yu' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>💊 治愈选牌 — 点击2张手牌弃置 (已选 {treasureCardIds.length}/2), 再选1名不满血的角色回复1血</span>
                  <button style={treasureBtnStyle} onClick={cancelTreasureSkill}>取消</button>
                </div>
              )}

              {/* 7. 烽火选装备 */}
              {treasureSkill === 'feng-huo' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,152,0,0.18), rgba(230,81,0,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ff9800',
                  color: '#ff9800', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,152,0,0.4)',
                }}>
                  <span style={{ flex: 1 }}>🔥 烽火选装备 — 点击装备区一张装备直接弃置触发烽火狼烟</span>
                  <button style={treasureBtnStyle} onClick={cancelTreasureSkill}>取消</button>
                </div>
              )}

              {/* 8. 绝击 — 选武器或自伤 */}
              {treasureSkill === 'jue-ji' && phase === 'treasureSelectWeapon' && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '6px 12px',
                  background: 'rgba(255,87,34,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(255,87,34,0.3)',
                  color: '#ff5722', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>⚔ 绝击 — 点击装备区或手牌里的武器弃置触发, 或点"受1血"自伤</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={cancelTreasureSkill}>取消</button>
                    <button
                      className="primary"
                      style={treasureBtnStyle}
                      onClick={() => playerJueJiSelf(null)}
                    >
                      受1血
                    </button>
                  </div>
                </div>
              )}

              {/* 9. 侠胆拼点 — 选自己手牌 */}
              {phase === 'xiaDanPickCard' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    🗡️ 侠胆 — 与<b>{xiaDanTargetName ?? '目标'}</b>拼点, 双方同时选牌, 请选择1张手牌 (≥ 对方点数即胜)
                  </span>
                  <button style={treasureBtnStyle} onClick={cancelXiaDanCard}>取消</button>
                </div>
              )}

              {/* 10. 刺客 — 红色不可闪, 黑色弃对方1张 */}
              {ciKePrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(156,39,176,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(156,39,176,0.3)',
                  color: '#ce93d8', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>🗡️ 刺客 — 对 <b>{ciKePrompt.defenderName}</b> 发动? (红色 → 不可被闪; 黑色 → 造成伤害后弃对方1张牌)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={cancelCiKe}>不用</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmCiKe}>发动</button>
                  </div>
                </div>
              )}

              {/* 10b. 强掠 — 杀被闪后判定, 黑色抽对方1张 */}
              {qiangLuePrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(244,67,54,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(244,67,54,0.3)',
                  color: '#ef9a9a', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>⚔️ 强掠 — 杀被 <b>{qiangLuePrompt.defenderName}</b> 闪避, 是否发动判定? (黑色 → 抽对方1张牌)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={cancelQiangLue}>不用</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmQiangLue}>发动</button>
                  </div>
                </div>
              )}

              {/* 11. 玉如意/国色 — 受到攻击时是否发动判定 */}
              {yuRuYiPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'rgba(255,235,59,0.12)', borderRadius: '6px',
                  border: '1px solid rgba(255,235,59,0.3)',
                  color: '#fff59d', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>🛡️ 玉如意 — 受到【{yuRuYiPrompt.attackName}】攻击, 是否发动判定? (红色 → 视为闪)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={cancelYuRuYi}>不用</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmYuRuYi}>发动</button>
                  </div>
                </div>
              )}

              {/* 12. 蝶魂 — 群体锦囊目标是否发动 */}
              {dieHunPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(186,153,255,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(186,153,255,0.3)',
                  color: '#ba99ff', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>🦋 蝶魂 — 受到群体锦囊【{dieHunPrompt.schemeName}】, 是否发动? (跳过结算并摸1张牌)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={cancelDieHun}>不发动</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmDieHun}>发动</button>
                  </div>
                </div>
              )}

              {/* 13. 曼舞 — 选红桃/黑桃手牌弃掉 (已选目标后选牌) */}
              {manWuRedHeartCards.length > 0 && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(255,182,193,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(255,182,193,0.3)',
                  color: '#ffb6c1', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>💃 曼舞 — 点击1张红桃/黑桃手牌弃掉转移伤害 (目标摸X张牌，X为你损失的血量)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="primary"
                      style={treasureBtnStyle}
                      onClick={confirmManWuCard}
                      disabled={!manWuSelectedCardId}
                    >确定</button>
                    <button style={treasureBtnStyle} onClick={cancelManWu}>不发动</button>
                  </div>
                </div>
              )}

              {/* 14. 曼舞 — 选择转移目标 (先选目标) */}
              {manWuPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(255,182,193,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(255,182,193,0.3)',
                  color: '#ffb6c1', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>💃 曼舞 — 选择转移目标 (目标将摸X张牌，X为你损失的血量)</span>
                  <button style={treasureBtnStyle} onClick={cancelManWu}>不发动</button>
                </div>
              )}

              {/* 15. 天香 — 装备区可弃的牌 (点击弃掉) */}
              {phase === 'tianXiang' && tianXiangEquipment.length > 0 && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(244,143,177,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(244,143,177,0.3)',
                  color: '#f48fb1', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>🌸 天香 — 装备区 (点击弃掉免判)</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tianXiangEquipment.map(card => (
                      <div key={card.id} onClick={() => selectTianXiangCard(card.id)} style={{ cursor: 'pointer' }}>
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 16. 天香 — 判定前弃1张手牌或装备免判 (判定牌不消失) */}
              {phase === 'tianXiang' && tianXiangJudgeCard && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(244,143,177,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(244,143,177,0.3)',
                  color: '#f48fb1', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>
                    🌸 天香 — 即将判定【{tianXiangJudgeCard.name}】({tianXiangJudgeCard.suit === 'heart' ? '♥' : tianXiangJudgeCard.suit === 'diamond' ? '♦' : tianXiangJudgeCard.suit === 'spade' ? '♠' : '♣'}{tianXiangJudgeCard.number === 1 ? 'A' : tianXiangJudgeCard.number > 10 ? ['J','Q','K'][tianXiangJudgeCard.number - 11] : tianXiangJudgeCard.number}),
                    点击1张手牌或装备区弃掉免判 (判定牌不消失, 同一回合仍会判定)
                  </span>
                  <button style={treasureBtnStyle} onClick={() => selectTianXiangCard(null)}>不发动</button>
                </div>
              )}

              {/* 17a. 门神 — 出牌阶段结束询问是否发动 */}
              {phase === 'menShenConfirm' && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(99,179,237,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(99,179,237,0.3)',
                  color: '#90caf9', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>🚪 门神 — 是否发动？指定1名角色，到你下回合开始前对其的【杀】/【决斗】将转移给你</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button style={treasureBtnStyle} onClick={confirmMenShen}>发动</button>
                    <button style={treasureBtnStyle} onClick={cancelMenShenConfirm}>不发动</button>
                  </div>
                </div>
              )}

              {/* 17b. 门神 — 出牌阶段结束选保护目标 */}
              {phase === 'menShenTarget' && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(99,179,237,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(99,179,237,0.3)',
                  color: '#90caf9', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>🚪 门神 — 选择1个保护目标，到你下回合开始前对其的【杀】/【决斗】将转移给你</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {menShenCandidates.map(c => (
                      <button key={c.id} style={treasureBtnStyle} onClick={() => selectMenShenTarget(c.id)}>
                        {c.name} ({c.currentHp}/{c.maxHp})
                      </button>
                    ))}
                    <button style={treasureBtnStyle} onClick={cancelMenShenTarget}>不发动</button>
                  </div>
                </div>
              )}

              {/* 18. 诀别 — 虞姬濒死选择男性 */}
              {phase === 'jueBieTarget' && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(244,143,177,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(244,143,177,0.3)',
                  color: '#f48fb1', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>💔 诀别 — 选择1名男性角色，阵亡后所有手牌和装备归他</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {jueBieCandidates.map(c => (
                      <button key={c.id} style={treasureBtnStyle} onClick={() => selectJueBieTarget(c.id)}>
                        {c.name} ({c.currentHp}/{c.maxHp})
                      </button>
                    ))}
                    <button style={treasureBtnStyle} onClick={cancelJueBieTarget}>不发动 (失效)</button>
                  </div>
                </div>
              )}

              {/* 19. 鸩杀 — 吕雉对濒死目标使用【药】 */}
              {zhenShaPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(171,71,71,0.18)', borderRadius: '4px',
                  border: '1px solid rgba(171,71,71,0.4)',
                  color: '#ff8a8a', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>☠️ 鸩杀 — {zhenShaPrompt.targetName} 濒死，是否弃1张【药】使其立即阵亡？</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={confirmZhenSha}>使用【药】</button>
                    <button style={treasureBtnStyle} onClick={cancelZhenSha}>不发动</button>
                  </div>
                </div>
              )}

              {/* 20. 三板斧 — 程咬金出杀确认 */}
              {sanBanFuPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(255,152,0,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(255,152,0,0.3)',
                  color: '#ffb74d', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>🪓 三板斧 — 对 {sanBanFuPrompt.targetName} 出【杀】，是否发动三板斧？(0闪：目标-2血+你弃1张；1闪：双方各-1血；2闪：你-1血)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={confirmSanBanFu}>发动</button>
                    <button style={treasureBtnStyle} onClick={cancelSanBanFu}>普通【杀】</button>
                  </div>
                </div>
              )}

              {/* 20.5 盘龙棍 — 杀被闪避后是否继续追击 */}
              {panLongGunPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '6px 10px',
                  background: 'linear-gradient(135deg, rgba(120,80,40,0.18), rgba(60,30,15,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #c8a050',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(200,160,80,0.4)',
                }}>
                  <span>🐉 盘龙棍 — 杀被闪避, 是否对 <b>{panLongGunPrompt.defenderName}</b> 继续出【杀】?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelPanLongGun}>不发动</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmPanLongGun}>继续出杀</button>
                  </div>
                </div>
              )}

              {/* 21. 复仇触发 — 受伤后是否发动判定 */}
              {fuChouTriggerPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(244,67,54,0.18), rgba(183,28,28,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ef5350',
                  color: '#ef9a9a', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(244,67,54,0.4)',
                }}>
                  <span style={{ flex: 1 }}>🗡️ 复仇 — 受到 <b>{fuChouTriggerPrompt.attackerName}</b> 的伤害, 是否发动?(判定非红桃则来源弃2张手牌或掉1血)</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelFuChouTrigger}>不发动</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmFuChouTrigger}>发动</button>
                  </div>
                </div>
              )}

              {/* 21.5 舍身触发 — 受伤后是否发动摸2N张分配 */}
              {sheShenTriggerPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(183,69,58,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>🪷 舍身 — 受到 <b>{sheShenTriggerPrompt.damage}</b> 点伤害, 是否发动摸 {sheShenTriggerPrompt.drawCount} 张并分配?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={() => confirmSheShenTrigger(false)}>不发动</button>
                    <button className="primary" style={treasureBtnStyle} onClick={() => confirmSheShenTrigger(true)}>发动</button>
                  </div>
                </div>
              )}

              {/* 22. 复仇选择 — 被复仇者(玩家)选 弃2张手牌 / 掉1血 */}
              {fuChouChoosePrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(244,67,54,0.18), rgba(183,28,28,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ef5350',
                  color: '#ef9a9a', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(244,67,54,0.4)',
                }}>
                  <span style={{ flex: 1 }}>🗡️ 复仇判定成功 — 你被 {fuChouChoosePrompt.attackerName} 复仇, 手牌{fuChouChoosePrompt.handCount}张. 请选择:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="primary" style={treasureBtnStyle} onClick={() => confirmFuChouChoose('discard')}>弃2张手牌</button>
                    <button style={treasureBtnStyle} onClick={() => confirmFuChouChoose('damage')}>掉1血</button>
                  </div>
                </div>
              )}

              {/* 23. 补刀 — 关羽回合外对受害角色补杀 */}
              {phase === 'buDaoKill' && buDaoPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(99,179,237,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(99,179,237,0.3)',
                  color: '#90caf9', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>⚔️ 补刀 — {buDaoPrompt.victimName} 攻击范围内被掉血，是否出【杀】？不消耗出杀次数</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button style={treasureBtnStyle} onClick={() => selectBuDaoCard(null)}>不补</button>
                  </div>
                </div>
              )}

              {/* 23.5 布道 — 张三丰摸牌前是否发动 */}
              {phase === 'buDao3Trigger' && buDao3TriggerPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    ⚔️ <b style={{ fontSize: '14px' }}>布道</b> — 是否发动？
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelBuDao3Trigger}>放弃</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmBuDao3Trigger}>发动</button>
                  </div>
                </div>
              )}

              {/* 24. 超脱 — 李煜判定时用黑色牌替换 */}
              {phase === 'chaoTuoPick' && chaoTuoPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(171,71,188,0.18)', borderRadius: '4px',
                  border: '1px solid rgba(171,71,188,0.4)',
                  color: '#ce93d8', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>🌌 超脱 — 判定【{chaoTuoPrompt.judgeCardName}】, 可用黑色手牌或装备替换</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {chaoTuoPrompt.blackHandIds.map(id => {
                      const c = playerHand.find(x => x.id === id)
                      if (!c) return null
                      return (
                        <button key={id} onClick={() => selectChaoTuoCard(id)} style={{
                          padding: '4px 8px', fontSize: '11px',
                          background: 'var(--bg-medium)', border: '1px solid #ce93d8',
                          color: 'var(--text-light)', borderRadius: '3px', cursor: 'pointer',
                        }}>
                          【{c.name}】{c.suit}{c.number}
                        </button>
                      )
                    })}
                    {chaoTuoPrompt.blackEquipment.map(({ cardId, slot, name }) => (
                      <button key={cardId} onClick={() => selectChaoTuoCard(cardId)} style={{
                        padding: '4px 8px', fontSize: '11px',
                        background: 'var(--bg-medium)', border: '1px solid #ce93d8',
                        color: 'var(--text-light)', borderRadius: '3px', cursor: 'pointer',
                      }}>
                        【{name}】({slot})
                      </button>
                    ))}
                    <button style={treasureBtnStyle} onClick={() => selectChaoTuoCard(null)}>不替换</button>
                  </div>
                </div>
              )}

              {/* 25. 后主 — 李煜用闪后选目标判定 */}
              {phase === 'houZhuTarget' && houZhuPrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(244,143,177,0.12)', borderRadius: '4px',
                  border: '1px solid rgba(244,143,177,0.3)',
                  color: '#f48fb1', fontSize: '12px',
                }}>
                  <div style={{ marginBottom: '6px' }}>👑 后主 — 选一名其他角色进行判定 (黑桃则掉2血)</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {houZhuPrompt.candidates.map(c => (
                      <button key={c.id} style={treasureBtnStyle} onClick={() => selectHouZhuTarget(c.id)}>
                        {c.name} ({c.currentHp}/{c.maxHp})
                      </button>
                    ))}
                    <button style={treasureBtnStyle} onClick={() => selectHouZhuTarget(null)}>不发动</button>
                  </div>
                </div>
              )}

              {/* 26. 濒死救援 — 与出牌提示同尺寸横幅, 直接点击手牌中的药/红桃使用 */}
              {phase === 'dyingRescue' && dyingRescuePrompt && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(244,67,54,0.18), rgba(183,28,28,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ef5350',
                  color: '#ef9a9a', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(244,67,54,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    💀 <b style={{ fontSize: '14px' }}>濒死救援</b> — <b>{dyingRescuePrompt.targetName}</b> 濒死！点击手牌中的【药】或红桃(回春)救援
                  </span>
                  <button style={treasureBtnStyle} onClick={cancelDyingRescue}>放弃救援</button>
                </div>
              )}

              {/* 27. 芦叶枪 — 选2张手牌当杀 */}
              {phase === 'selectDualCards' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,215,0,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    🎋 <b>【芦叶枪】</b> 选择2张手牌当杀 (第二张会弃置, 已选 {selectedDualCards.length}/2)
                    {selectedDualCards.length < 2
                      ? <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>(继续点击手牌选择)</span>
                      : <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>(可点击确定)</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelDualCards}>取消</button>
                    <button
                      className="primary"
                      style={{ ...treasureBtnStyle, opacity: selectedDualCards.length === 2 ? 1 : 0.5 }}
                      disabled={selectedDualCards.length !== 2}
                      onClick={confirmDualCards}
                    >确定</button>
                  </div>
                </div>
              )}

              {/* 27b. 芦叶枪 — 选目标 (第一张牌已高亮【杀】徽章) */}
              {phase === 'selectLuYeQiangTarget' && luYeQiangKillCardId && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(211,47,47,0.18), rgba(183,28,28,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #d32f2f',
                  color: '#ffcdd2', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(211,47,47,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    🗡️ <b>【芦叶枪·杀】</b> 请点击敌方角色选择目标 (高亮的第一张牌当杀)
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelLuYeQiangTarget}>取消</button>
                  </div>
                </div>
              )}

              {/* 28. 狼牙棒多目标 — 最后一张手牌出杀可指定多目标 (最多3) */}
              {phase === 'selectMultiTargets' && (
                <div style={{
                  pointerEvents: 'auto',
                  padding: '8px 12px',
                  background: 'rgba(255,140,0,0.15)', borderRadius: '4px',
                  border: '1px solid rgba(255,140,0,0.3)',
                  color: '#ffa726', fontSize: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <span>🐺 狼牙棒 — 点击敌方选择目标 (最多3个, 已选 {selectedTargets.length}/3)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={treasureBtnStyle} onClick={cancelMultiTarget}>取消</button>
                    <button className="primary" style={treasureBtnStyle} disabled={selectedTargets.length === 0} onClick={confirmMultiTarget}>出杀</button>
                  </div>
                </div>
              )}

              {/* 29. 侠胆/狼牙棒多杀 — 选多目标出杀 (无视距离, 最多 killMultiMax 目标/张) */}
              {phase === 'selectKillMultiTargets' && (
                wolfFangPromptRect
                  ? (
                    <div style={{
                      position: 'fixed',
                      left: wolfFangPromptRect.left,
                      top: wolfFangPromptRect.top - 38,
                      width: wolfFangPromptRect.width,
                      zIndex: 100,
                      pointerEvents: 'auto',
                      padding: '4px 6px',
                      background: 'rgba(255,215,0,0.95)', borderRadius: '4px',
                      border: '1px solid rgba(255,215,0,0.8)',
                      color: '#1a1a1a', fontSize: '11px', fontWeight: 600,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}>
                      <span>🗡️ 多杀 {selectedTargets.length}/{killMultiMax || 2}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button style={treasureBtnStyle} onClick={cancelKillMultiTarget}>取消</button>
                        <button className="primary" style={treasureBtnStyle} disabled={selectedTargets.length === 0} onClick={confirmKillMultiTarget}>出杀</button>
                      </div>
                    </div>
                  )
                  : (
                    <div style={{
                      pointerEvents: 'auto',
                      padding: '8px 12px',
                      background: 'rgba(255,215,0,0.15)', borderRadius: '4px',
                      border: '1px solid rgba(255,215,0,0.3)',
                      color: '#ffd54f', fontSize: '12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                    }}>
                      <span>🗡️ 多杀 — 点击敌方选择目标 (最多 {killMultiMax || 2} 个, 已选 {selectedTargets.length}/{killMultiMax || 2})</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={treasureBtnStyle} onClick={cancelKillMultiTarget}>取消</button>
                        <button className="primary" style={treasureBtnStyle} disabled={selectedTargets.length === 0} onClick={confirmKillMultiTarget}>出杀</button>
                      </div>
                    </div>
                  )
              )}

              {/* 30. 起义 (陈胜) — Step 1: 是否发动 */}
              {phase === 'qiYiPrompt' && qiYiDecision && qiYiStep === 'confirm' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  padding: '5px 8px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    ⚔️ <b style={{ fontSize: '14px' }}>起义</b> — 本回合可放弃摸牌, 改为从场上其他角色中抽至多 2 张手牌. 是否发动?
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={treasureBtnStyle} onClick={cancelQiYiDecision}>放弃</button>
                    <button className="primary" style={treasureBtnStyle} onClick={confirmQiYiDecision}>发动</button>
                  </div>
                </div>
              )}

              {/* 30. 起义 — Step 2: 选 1-2 个目标 — 直接点击场上英雄, 状态栏放入手牌提示位 */}
              {phase === 'qiYiPrompt' && qiYiDecision && qiYiStep === 'pickTargets' && (
                <div style={{
                  pointerEvents: 'auto',
                  width: '70%',
                  margin: '0 auto',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
                  borderRadius: '6px',
                  border: '2px solid #ffd54f',
                  color: '#ffd54f', fontSize: '13px',
                  boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
                }}>
                  <span style={{ flex: 1 }}>
                    ⚔️ <b style={{ fontSize: '14px' }}>起义</b> — 直接点击场上英雄 (有手牌) 选择目标 (已选 {treasureTargetIds.length}/2)
                  </span>
                  <button
                    className="primary"
                    style={{ ...treasureBtnStyle, opacity: treasureTargetIds.length === 0 ? 0.5 : 1 }}
                    disabled={treasureTargetIds.length === 0}
                    onClick={confirmQiYiDecision}
                  >
                    确认
                  </button>
                </div>
              )}

              {/* 30. 起义 — Step 3: 抽牌 — 单独浮层, 见 BattleOverlays */}

              {/* 31. 疏财 — 选手牌 → 选英雄 → 确认 */}
              {shuCaiActive && (() => {
                const targetName = shuCaiTargetId ? (gameState?.heroes.find(h => h.hero.id === shuCaiTargetId)?.hero.name ?? '') : ''
                return (
                  <div style={{
                    pointerEvents: 'auto',
                    width: '70%',
                    margin: '0 auto',
                    padding: '5px 8px',
                    background: 'linear-gradient(135deg, rgba(255,152,0,0.18), rgba(230,81,0,0.18))',
                    borderRadius: '6px',
                    border: '2px solid #ff9800',
                    color: '#ffb74d', fontSize: '13px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    boxShadow: '0 2px 12px rgba(255,152,0,0.4)',
                  }}>
                    <span style={{ flex: 1 }}>
                      🎁 <b style={{ fontSize: '14px' }}>疏财</b> —
                      {shuCaiSelectedCardIds.length === 0
                        ? <span>点击手牌选择要发出的牌</span>
                        : shuCaiTargetId
                          ? <span>已选 {shuCaiSelectedCardIds.length} 张 → 目标 <b>{targetName}</b>, 出2张或以上自己回1血</span>
                          : <span>已选 {shuCaiSelectedCardIds.length} 张, 请点击场上角色选择目标</span>
                      }
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={treasureBtnStyle} onClick={deactivateShuCai}>取消</button>
                      <button
                        className="primary"
                        style={{ ...treasureBtnStyle, opacity: (shuCaiSelectedCardIds.length > 0 && !!shuCaiTargetId) ? 1 : 0.5 }}
                        disabled={shuCaiSelectedCardIds.length === 0 || !shuCaiTargetId}
                        onClick={confirmShuCai}
                      >
                        确认发送
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
            )}
    </>
  )
}
