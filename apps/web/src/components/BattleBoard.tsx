import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useBattleStore } from '../stores/battleStore'

import { HeroBattleCard } from './HeroBattleCard'
import { HandCard } from './HandCard'
import { BattleLog } from './BattleLog'
import type { Card } from '@hero-legend/shared-types'

export function BattleBoard() {
  const [resultOverlayDismissed, setResultOverlayDismissed] = useState(false)
  const [lastClickedHandCardId, setLastClickedHandCardId] = useState<string | null>(null)
  const {
    gameState, phase, playerHand, actionLog, result, equippedCards, pendingCardId, pendingCardType, selectedTargetId,
    playKill, playScheme, playSchemeSelf, confirmTarget, confirmPlay, cancelPlay, playHeal, equipCard, endPlayPhase, cancelSelection, game,
    judgeReplace, judgeCard, responsePrompt, toggleAoJian, respondWithCard,
    multiTargetCandidates, selectedTargets, toggleTarget, confirmMultiTarget, cancelMultiTarget,
    killMultiMax, killMultiRemaining, toggleKillMultiTarget, confirmKillMultiTarget, cancelKillMultiTarget,
    selectedDualCards, toggleDualCard, confirmDualCards, cancelDualCards,
    luYeQiangCandidates, selectLuYeQiangTarget, cancelLuYeQiangTarget,
    longLinTargetInfo, longLinSelectedCards, toggleLongLinCard, confirmLongLinPick, cancelLongLinPick,
    jieDaoHolders, jieDaoCandidates, selectJieDaoHolder, cancelJieDaoHolder, selectJieDaoTarget, cancelJieDaoTarget,
    tanNangCandidates, tanNangTargetInfo, selectTanNangTarget, cancelTanNangTarget, selectTanNangCard, cancelTanNangCard,
    wuguCandidates, selectWuguCard, cancelWuguPick,
    fudiTargetInfo, selectFudiTarget, cancelFudiTarget, selectFudiCard, cancelFudiCard,
    faJiaTargetInfo, selectFaJiaCard, cancelFaJiaCard,
    treasureSkill, treasurePrompt, treasureCardIds, treasureTargetIds, qiYiCardMap, yuRenCardIds,
    useTreasureSkill, pickTreasureCard, pickTreasureTarget, confirmTreasureTargets, cancelTreasureSkill, confirmYuRenCards, pickQiYiCard, confirmQiYiCards,
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
  } = useBattleStore()

  if (!gameState) return null

  const treasureBtnStyle = {
    fontSize: '12px',
    padding: '4px 10px',
    background: 'var(--bg-dark)',
    color: 'var(--text-light)',
    border: '1px solid #b8860b',
    borderRadius: '4px',
    cursor: 'pointer',
  } as const

  const enemies = gameState.heroes.filter(h => h.role === 'enemy')
  const allies = gameState.heroes.filter(h => h.role === 'ally')
  const player = gameState.heroes.find(h => h.role === 'player')

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

  const otherPositions: CSSProperties[] = (() => {
    const n = others.length
    if (n === 1) {
      return [{ left: '50%', top: '20px', transform: 'translateX(-50%)' }]
    }
    if (n === 2) {
      // 2个都是距离1: 都放中部
      return [
        { left: '30px', top: '50%' },
        { right: '30px', top: '50%' },
      ]
    }
    // n >= 3
    const topCount = n - 2
    const positions: CSSProperties[] = [
      { left: '30px', top: '50%' },       // others[0]: 中部左 (seating idx 1, 距离1)
    ]
    for (let i = 0; i < topCount; i++) {
      const leftPct = 5 + (i + 0.5) * (90 / topCount)
      positions.push({ left: `${leftPct}%`, top: '20px' })   // others[1..N-2]: 顶部
    }
    positions.push({ right: '30px', top: '50%' })            // others[N-1]: 中部右 (seating idx n-1, 距离1)
    return positions
  })()

  // pending 状态下, 杀/锦囊目标可选 (但不直接commit, 仅高亮)
  const isPendingTargeting = phase === 'playing' && pendingCardId !== null && (pendingCardType === 'kill' || pendingCardType === 'scheme')
  // pending 状态下, 其他目标应加阴影显示 (dimInvalidTargets)
  const shouldDimInvalidTargets = isPendingTargeting

  // 渲染一个非玩家英雄卡 (敌方/友方通用, 含可点击/选中/AI回合高亮)
  const renderOtherHeroCard = (h: typeof others[0], dimInvalidTargets?: boolean) => (
    <HeroBattleCard
      key={h.hero.id}
      hero={h}
      isCurrentTurn={gameState.currentHeroId === h.hero.id && !isPlayerTurn}
      isSelectable={
        (h.currentHp > 0 && !(xiaDanActive && h.handCards.length === 0)) &&
        (
          (phase === 'selectTarget' && isValidTarget(h.hero.id)) ||
          (isPendingTargeting && isValidTarget(h.hero.id)) ||
          (phase === 'selectMultiTargets') ||
          (phase === 'selectKillMultiTargets') ||
          (phase === 'selectJieDaoHolder' && jieDaoHolders.some(jh => jh.id === h.hero.id)) ||
          (phase === 'selectJieDaoTarget' && jieDaoCandidates.some(jc => jc.id === h.hero.id)) ||
          (phase === 'selectLuYeQiangTarget' && luYeQiangCandidates.some(lc => lc.id === h.hero.id)) ||
          (phase === 'treasureSelectTarget') ||
          (phase === 'treasureSelectTargets') ||
          (manWuPrompt !== null && manWuPrompt.candidates.some((c: any) => c.id === h.hero.id))
        )
      }
      isSelected={selectedTargetId === h.hero.id}
      dimmed={(!!dimInvalidTargets && !isValidTarget(h.hero.id)) || (shouldDimInvalidTargets && !isValidTarget(h.hero.id))}
      onClick={() => {
        if (isPendingTargeting) {
          if (isValidTarget(h.hero.id)) confirmTarget(h.hero.id)
          return
        }
        if (phase === 'selectTarget') confirmTarget(h.hero.id)
        else if (phase === 'selectMultiTargets') toggleTarget(h.hero.id)
        else if (phase === 'selectKillMultiTargets') toggleKillMultiTarget(h.hero.id)
        else if (phase === 'selectJieDaoHolder') {
          if (jieDaoHolders.some(jh => jh.id === h.hero.id)) selectJieDaoHolder(h.hero.id)
        }
        else if (phase === 'selectJieDaoTarget') selectJieDaoTarget(h.hero.id)
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

  // 始终从引擎读取傲剑激活状态 (store 的状态可能与引擎不同步)
  const aoJianActive = game?.isAoJianActive(player?.hero?.id ?? '') ?? false

  // 选目标阶段: 判断某英雄是否合法目标 (用于高亮可杀/可探囊的目标, 其他玩家变暗)
  const pendingSchemeName = (() => {
    if (phase !== 'selectTarget' || pendingCardType !== 'scheme' || !pendingCardId) return null
    return playerHand.find(c => c.id === pendingCardId)?.name ?? null
  })()
  const pendingSchemeCard = (() => {
    if (phase !== 'selectTarget' || pendingCardType !== 'scheme' || !pendingCardId) return null
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
    return true
  }
  // 选目标阶段是否应启用 dim 效果 (出杀/锦囊)
  const dimInvalidTargets = !!(game && player && (
    (phase === 'selectTarget' && (pendingCardType === 'kill' || (pendingCardType === 'scheme' && pendingSchemeName === '探囊取物'))) ||
    (phase === 'treasureSelectTarget' && useBattleStore.getState().treasureSkill === 'jue-ji')
  ))

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget'
  const canPlayKill = game?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true

  // 校验某张锦囊牌是否当前有合法目标 (用于禁用 探囊/釜底 等需选目标的牌)
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
      {/* Pending出牌提示横幅 — 固定位置, 位于玩家信息栏上方 */}
      {phase === 'playing' && pendingCardId && pendingCardType && (() => {
        const pendingCard = playerHand.find(c => c.id === pendingCardId)
        if (!pendingCard) return null
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
          '釜底抽薪': '弃攻击范围内1名其他角色的1张手牌/判定/装备',
          '借刀杀人': '选择1名装备武器的其他角色, 该角色需对其攻击范围内的另一名角色使用【杀】',
          '手捧雷': '延时锦囊, 判定非♠2-9则目标受到2点雷电伤害',
          '画地为牢': '延时锦囊, 判定非♥则目标跳过下回合出牌阶段',
          '休养生息': '立即回复1点体力',
        }
        const desc = descMap[pendingCard.name] ?? (pendingCard as any).description ?? '该牌的特殊效果'
        const needTarget = pendingCardType === 'kill' || pendingCardType === 'scheme'
        const selectedTargetName = selectedTargetId ? (gameState?.heroes.find(h => h.hero.id === selectedTargetId)?.hero.name ?? '') : ''
        const canConfirm = !needTarget || !!selectedTargetId
        const confirmLabel = needTarget
          ? (selectedTargetId ? `确定 → ${selectedTargetName}` : '请先选择目标')
          : `确定使用【${pendingCard.name}】`
        const suitColor = pendingCard.suit === 'heart' || pendingCard.suit === 'diamond' ? '#e57373' : 'var(--text-light)'
        return (
          <div style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(255,213,79,0.18), rgba(184,134,11,0.18))',
            borderRadius: '6px',
            border: '2px solid #ffd54f',
            color: '#ffd54f', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
            boxShadow: '0 2px 12px rgba(255,213,79,0.4)',
            flex: '0 0 auto',
          }}>
            <span style={{ flex: 1 }}>
              🎯 <b style={{ color: suitColor, fontSize: '14px' }}>【{pendingCard.name}】</b> {desc}
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

      {/* Battle field: 顶部战场, 其他角色按逆时针分布在玩家周围 */}
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: 'var(--bg-dark)', border: '1px solid var(--border-wood)', borderRadius: '8px', padding: '8px', overflow: 'hidden' }}>
        {/* 顶部提示 (悬浮在战场上方, 不阻挡角色) */}
        {(phase === 'selectTarget' || phase === 'selectMultiTargets' || phase === 'selectKillMultiTargets' || phase === 'selectJieDaoHolder' || phase === 'selectJieDaoTarget') && (
          <div style={{ position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, maxWidth: '60%' }}>
            {phase === 'selectTarget' && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(255,68,68,0.15)', borderRadius: '4px',
                border: '1px solid rgba(255,68,68,0.3)',
                color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
              }}>
                点击敌方英雄选择攻击目标
              </div>
            )}
            {phase === 'selectMultiTargets' && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(255,140,0,0.15)', borderRadius: '4px',
                border: '1px solid rgba(255,140,0,0.3)',
                color: '#ffa726', fontSize: '13px', textAlign: 'center',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              }}>
                <span>🐺 狼牙棒 — 点击敌方选择目标 (最多3个, 已选 {selectedTargets.length}/3)</span>
                <button style={{ fontSize: '12px' }} onClick={cancelMultiTarget}>取消</button>
                <button className="primary" style={{ fontSize: '12px' }} disabled={selectedTargets.length === 0} onClick={confirmMultiTarget}>出杀</button>
              </div>
            )}
            {phase === 'selectKillMultiTargets' && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(255,215,0,0.15)', borderRadius: '4px',
                border: '1px solid rgba(255,215,0,0.3)',
                color: '#ffd54f', fontSize: '13px', textAlign: 'center',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              }}>
                <span>🗡️ 侠胆 — 点击敌方选择目标 (最多 {killMultiMax || 2} 个, 已选 {selectedTargets.length}/{killMultiMax || 2}; 剩余 {killMultiRemaining} 次出杀)</span>
                <button style={{ fontSize: '12px' }} onClick={cancelKillMultiTarget}>取消</button>
                <button className="primary" style={{ fontSize: '12px' }} disabled={selectedTargets.length === 0} onClick={confirmKillMultiTarget}>出杀</button>
              </div>
            )}
            {phase === 'selectJieDaoHolder' && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(255,140,0,0.15)', borderRadius: '4px',
                border: '1px solid rgba(255,140,0,0.3)',
                color: '#ffa726', fontSize: '13px', textAlign: 'center',
              }}>
                借刀杀人 — 点击有武器的玩家
                <button style={{ fontSize: '12px', marginLeft: '12px' }} onClick={cancelJieDaoHolder}>取消</button>
              </div>
            )}
            {phase === 'selectJieDaoTarget' && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(255,68,68,0.15)', borderRadius: '4px',
                border: '1px solid rgba(255,68,68,0.3)',
                color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
              }}>
                借刀杀人 — 选择被借刀玩家的攻击目标
                <button style={{ fontSize: '12px', marginLeft: '12px' }} onClick={cancelJieDaoTarget}>取消</button>
              </div>
            )}
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
          padding: '12px',
          flex: '0 0 auto',
          minHeight: '140px',
          overflow: 'hidden',
        }}>
          {/* 布局: 玩家卡(左侧上下占满) | 提示 + 手牌 + 技能按钮行 */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            {/* 左侧: 玩家卡 (上下占满) */}
            <div style={{ flex: '0 0 auto', display: 'flex' }}>
              <HeroBattleCard
                hero={player}
                isCurrentTurn={isPlayerTurn}
                isSelectable={phase === 'selectJieDaoTarget' && jieDaoCandidates.some(jc => jc.id === player.hero.id)}
                onClick={() => {
                  if (phase === 'selectJieDaoTarget') selectJieDaoTarget(player.hero.id)
                }}
                aoJianActive={aoJianActive}
                canPlayKill={canPlayKill && (isPlayerTurn || phase === 'awaitingResponse')}
                hasHongZhuang={hasHongZhuang}
                onEquipAsKill={(cardId: string) => {
                  if (phase === 'playing') playKill(cardId)
                  else if (phase === 'awaitingResponse') respondWithCard(cardId)
                }}
              />
            </div>

            {/* 右侧: 提示 + 手牌 + 技能按钮行 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '6px' }}>
          {/* Judge replace info */}
          {phase === 'judgeReplace' && judgeCard && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(100,181,246,0.12)', borderRadius: '4px',
              border: '1px solid rgba(100,181,246,0.3)',
              color: '#90caf9', fontSize: '12px',
            }}>
              判定牌: {judgeCard.name} ({judgeCard.suit === 'heart' ? '♥' : judgeCard.suit === 'diamond' ? '♦' : judgeCard.suit === 'spade' ? '♠' : '♣'}{judgeCard.number === 1 ? 'A' : judgeCard.number > 10 ? ['J','Q','K'][judgeCard.number - 11] : judgeCard.number})
              {' — '}弃一张手牌可替换此判定牌
            </div>
          )}

          {/* 响应提示: 决斗/南蛮/万箭/烽火/杀/闪 等待响应 */}
          {phase === 'awaitingResponse' && responsePrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(255,152,0,0.18)', borderRadius: '4px',
              border: '1px solid rgba(255,152,0,0.4)',
              color: '#ffb74d', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>⚡ {responsePrompt}</span>
              <button style={treasureBtnStyle} onClick={() => respondWithCard(null)}>放弃</button>
            </div>
          )}

          {/* 侠胆激活: 内联提示(无浮层) — 玩家点有手牌的角色 */}
          {xiaDanActive && (
            <div style={{
              marginBottom: '8px', padding: '6px 12px',
              background: 'rgba(255,215,0,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd54f', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>🗡️ 侠胆待选目标 — 点击1名<b>有手牌</b>的角色开始拼点</span>
              <button style={{ fontSize: '12px' }} onClick={cancelXiaDan}>取消</button>
            </div>
          )}

          {/* 驭人激活: 内联提示 + 确认/取消(无浮层) */}
          {treasureSkill === 'yu-ren' && (
            <div style={{
              marginBottom: '8px', padding: '6px 12px',
              background: 'rgba(255,215,0,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd54f', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🎴 驭人选牌 — 点击手牌切换选中, 已选 <b>{yuRenCardIds.length}</b> 张</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ fontSize: '12px' }} onClick={cancelTreasureSkill}>取消</button>
                <button
                  className="primary"
                  style={{ fontSize: '12px' }}
                  disabled={yuRenCardIds.length === 0}
                  onClick={confirmYuRenCards}
                >
                  确认驭人
                </button>
              </div>
            </div>
          )}

          {/* 烽火激活: 内联提示 — 装备区高亮可点 */}
          {treasureSkill === 'feng-huo' && (
            <div style={{
              marginBottom: '8px', padding: '6px 12px',
              background: 'rgba(255,152,0,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,152,0,0.3)',
              color: '#ff9800', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>🔥 烽火选装备 — 点击装备区一张装备直接弃置触发烽火狼烟</span>
              <button style={{ fontSize: '12px' }} onClick={cancelTreasureSkill}>取消</button>
            </div>
          )}

          {/* 绝击激活: 内联提示 — 选武器 (点击装备区/手牌武器) 或 点"受1血" */}
          {treasureSkill === 'jue-ji' && phase === 'treasureSelectWeapon' && (
            <div style={{
              marginBottom: '8px', padding: '6px 12px',
              background: 'rgba(255,87,34,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,87,34,0.3)',
              color: '#ff5722', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>⚔ 绝击 — 点击装备区或手牌里的武器弃置触发, 或点"受1血"自伤</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ fontSize: '12px' }} onClick={cancelTreasureSkill}>取消</button>
                <button
                  className="primary"
                  style={{ fontSize: '12px' }}
                  onClick={() => {
                    const { game, treasureTargetIds } = useBattleStore.getState()
                    const player = game!.getPlayer()!
                    game!.playerJueJi(player, null, treasureTargetIds[0])
                    useBattleStore.setState({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], treasureTargetIds: [], gameState: game!.getState(), playerHand: player.getHand() })
                  }}
                >
                  受1血
                </button>
              </div>
            </div>
          )}

          {/* 侠胆拼点提示: 双方同时选牌, 玩家选自己手牌 (不知道对方出什么) */}
          {phase === 'xiaDanPickCard' && (
            <div style={{
              marginBottom: '8px', padding: '10px 14px',
              background: 'rgba(255,215,0,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd54f', fontSize: '13px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>
                🗡️ 侠胆 — 与<b>{xiaDanTargetName ?? '目标'}</b>拼点, 双方同时选牌, 请选择1张手牌 (≥ 对方点数即胜)
              </span>
              <button style={{ fontSize: '12px' }} onClick={cancelXiaDanCard}>取消</button>
            </div>
          )}

          {/* 刺客提示: 内联 yes/no */}
          {ciKePrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(156,39,176,0.12)', borderRadius: '4px',
              border: '1px solid rgba(156,39,176,0.3)',
              color: '#ce93d8', fontSize: '13px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🗡️ 刺客 — 对 <b>{ciKePrompt.defenderName}</b> 发动? (红色 → 不可被闪; 黑色 → 造成伤害后弃对方1张牌)</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ fontSize: '12px' }} onClick={cancelCiKe}>不用</button>
                <button className="primary" style={{ fontSize: '12px' }} onClick={confirmCiKe}>发动</button>
              </div>
            </div>
          )}

          {/* 玉如意/国色提示: 内联 yes/no */}
          {yuRuYiPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(255,235,59,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,235,59,0.3)',
              color: '#fff59d', fontSize: '13px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🛡️ 玉如意 — 受到【{yuRuYiPrompt.attackName}】攻击, 是否发动判定? (红色 → 视为闪)</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ fontSize: '12px' }} onClick={cancelYuRuYi}>不用</button>
                <button className="primary" style={{ fontSize: '12px' }} onClick={confirmYuRuYi}>发动</button>
              </div>
            </div>
          )}

          {/* 蝶魂提示: 群体锦囊目标是否发动 (跳过结算并摸1张) */}
          {dieHunPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(186,153,255,0.12)', borderRadius: '4px',
              border: '1px solid rgba(186,153,255,0.3)',
              color: '#ba99ff', fontSize: '13px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🦋 蝶魂 — 受到群体锦囊【{dieHunPrompt.schemeName}】, 是否发动? (跳过结算并摸1张牌)</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ fontSize: '12px' }} onClick={cancelDieHun}>不发动</button>
                <button className="primary" style={{ fontSize: '12px' }} onClick={confirmDieHun}>发动</button>
              </div>
            </div>
          )}

          {/* 曼舞: 选择红桃/黑桃手牌弃掉 (先选目标后选牌) */}
          {manWuRedHeartCards.length > 0 && (
            <>
              <div style={{
                marginBottom: '8px', padding: '8px 12px',
                background: 'rgba(255,182,193,0.12)', borderRadius: '4px',
                border: '1px solid rgba(255,182,193,0.3)',
                color: '#ffb6c1', fontSize: '12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
              }}>
                <span>💃 曼舞 — 点击1张红桃/黑桃手牌弃掉转移伤害 (目标摸X张牌，X为你损失的血量)</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="primary"
                    style={{ fontSize: '12px' }}
                    onClick={confirmManWuCard}
                    disabled={!manWuSelectedCardId}
                  >确定</button>
                  <button style={{ fontSize: '12px' }} onClick={cancelManWu}>不发动</button>
                </div>
              </div>
            </>
          )}

          {/* 曼舞: 选择转移目标 (先选目标) */}
          {manWuPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(255,182,193,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,182,193,0.3)',
              color: '#ffb6c1', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>💃 曼舞 — 选择转移目标 (目标将摸X张牌，X为你损失的血量)</span>
              <button style={{ fontSize: '12px' }} onClick={cancelManWu}>不发动</button>
            </div>
          )}

          {/* 天香: 装备区可弃的牌 */}
          {phase === 'tianXiang' && tianXiangEquipment.length > 0 && (
            <>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px', marginTop: '4px' }}>装备区 (点击弃掉)</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {tianXiangEquipment.map(card => (
                  <div key={card.id} onClick={() => selectTianXiangCard(card.id)} style={{ cursor: 'pointer' }}>
                    <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 天香提示: 判定前弃1张手牌或装备免判(判定牌不消失) */}
          {phase === 'tianXiang' && tianXiangJudgeCard && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(244,143,177,0.12)', borderRadius: '4px',
              border: '1px solid rgba(244,143,177,0.3)',
              color: '#f48fb1', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>
                🌸 天香 — 即将判定【{tianXiangJudgeCard.name}】({tianXiangJudgeCard.suit === 'heart' ? '♥' : tianXiangJudgeCard.suit === 'diamond' ? '♦' : tianXiangJudgeCard.suit === 'spade' ? '♠' : '♣'}{tianXiangJudgeCard.number === 1 ? 'A' : tianXiangJudgeCard.number > 10 ? ['J','Q','K'][tianXiangJudgeCard.number - 11] : tianXiangJudgeCard.number}),
                点击1张手牌或装备区弃掉免判 (判定牌不消失, 同一回合仍会判定)
              </span>
              <button style={{ fontSize: '12px' }} onClick={() => selectTianXiangCard(null)}>不发动</button>
            </div>
          )}

          {/* 门神: 秦琼回合结束选择保护目标 */}
          {phase === 'menShenTarget' && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(99,179,237,0.12)', borderRadius: '4px',
              border: '1px solid rgba(99,179,237,0.3)',
              color: '#90caf9', fontSize: '12px',
            }}>
              <div style={{ marginBottom: '6px' }}>🚪 门神 — 回合结束可指定1个目标，到下回合开始前对其的【杀】/【决斗】将转移给你</div>
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

          {/* 诀别: 虞姬濒死选择男性 */}
          {phase === 'jueBieTarget' && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
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

          {/* 鸩杀: 吕雉对濒死目标是否使用【药】 */}
          {zhenShaPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(171,71,71,0.18)', borderRadius: '4px',
              border: '1px solid rgba(171,71,71,0.4)',
              color: '#ff8a8a', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>☠️ 鸩杀 — {zhenShaPrompt.targetName} 濒死，是否弃1张【药】使其立即阵亡？</span>
              <span>
                <button style={treasureBtnStyle} onClick={confirmZhenSha}>使用【药】</button>
                <button style={{ ...treasureBtnStyle, marginLeft: '6px' }} onClick={cancelZhenSha}>不发动</button>
              </span>
            </div>
          )}

          {/* 三板斧: 程咬金出杀确认 */}
          {sanBanFuPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(255,152,0,0.12)', borderRadius: '4px',
              border: '1px solid rgba(255,152,0,0.3)',
              color: '#ffb74d', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🪓 三板斧 — 对 {sanBanFuPrompt.targetName} 出【杀】，是否发动三板斧？(0闪：目标-2血+你弃1张；1闪：双方各-1血；2闪：你-1血)</span>
              <span>
                <button style={treasureBtnStyle} onClick={confirmSanBanFu}>发动</button>
                <button style={{ ...treasureBtnStyle, marginLeft: '6px' }} onClick={cancelSanBanFu}>普通【杀】</button>
              </span>
            </div>
          )}

          {/* 复仇: 受伤后是否发动判定 */}
          {fuChouTriggerPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(244,67,54,0.12)', borderRadius: '4px',
              border: '1px solid rgba(244,67,54,0.3)',
              color: '#ef9a9a', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🗡️ 复仇 — 受到 <b>{fuChouTriggerPrompt.attackerName}</b> 的伤害, 是否发动?(判定非红桃则来源弃2张手牌或掉1血)</span>
              <span>
                <button style={treasureBtnStyle} onClick={cancelFuChouTrigger}>不发动</button>
                <button style={{ ...treasureBtnStyle, marginLeft: '6px' }} className="primary" onClick={confirmFuChouTrigger}>发动</button>
              </span>
            </div>
          )}

          {/* 复仇: 被复仇者(玩家)选 弃2张手牌 / 掉1血 */}
          {fuChouChoosePrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(244,67,54,0.12)', borderRadius: '4px',
              border: '1px solid rgba(244,67,54,0.3)',
              color: '#ef9a9a', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🗡️ 复仇判定成功 — 你被 {fuChouChoosePrompt.attackerName} 复仇, 手牌{fuChouChoosePrompt.handCount}张. 请选择:</span>
              <span>
                <button style={treasureBtnStyle} className="primary" onClick={() => confirmFuChouChoose('discard')}>弃2张手牌</button>
                <button style={{ ...treasureBtnStyle, marginLeft: '6px' }} onClick={() => confirmFuChouChoose('damage')}>掉1血</button>
              </span>
            </div>
          )}

          {/* 复仇弃牌: 不再独立弹框, 直接点击手牌选2张 (选满后需点确定) */}
          {phase === 'selectFuChouDiscard' && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(244,67,54,0.12)', borderRadius: '4px',
              border: '1px solid rgba(244,67,54,0.3)',
              color: '#ef9a9a', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🗡️ 复仇弃牌 — 请从手牌中选2张弃掉 (已选 {fuChouPickSelected.length}/2)</span>
              <button
                style={treasureBtnStyle}
                className="primary"
                disabled={fuChouPickSelected.length < 2}
                onClick={confirmFuChouPick}
              >
                确认弃{fuChouPickSelected.length}张
              </button>
            </div>
          )}

          {/* 补刀: 关羽回合外对受害角色补杀 */}
          {phase === 'buDaoKill' && buDaoPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
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

          {/* 超脱: 李煜判定时用黑色牌替换 */}
          {phase === 'chaoTuoPick' && chaoTuoPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
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
                <button style={{ ...treasureBtnStyle, marginLeft: '6px' }} onClick={() => selectChaoTuoCard(null)}>不替换</button>
              </div>
            </div>
          )}

          {/* 后主: 李煜用闪后选目标 */}
          {phase === 'houZhuTarget' && houZhuPrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
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

          {/* 濒死救援: 玩家被询问是否用药救濒死目标 */}
          {phase === 'dyingRescue' && dyingRescuePrompt && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(171,71,71,0.18)', borderRadius: '4px',
              border: '1px solid rgba(171,71,71,0.4)',
              color: '#ff8a8a', fontSize: '12px',
            }}>
              <div style={{ marginBottom: '6px' }}>💀 濒死救援 — <b>{dyingRescuePrompt.targetName}</b> 濒死！是否用药或红桃(回春)救？(已选 {dyingRescueSelected.length} 张)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {dyingRescuePrompt.yaoHandCards.map(c => {
                  const picked = dyingRescueSelected.includes(c.id)
                  const label = c.name === '药' ? '【药】' : `【${c.name}♥】`
                  return (
                    <button key={c.id} onClick={() => toggleDyingRescueCard(c.id)} style={{
                      padding: '4px 8px', fontSize: '11px',
                      background: picked ? 'rgba(171,71,71,0.35)' : 'var(--bg-medium)',
                      border: picked ? '1px solid #ff8a8a' : '1px solid var(--border-wood)',
                      color: 'var(--text-light)', borderRadius: '3px', cursor: 'pointer',
                    }}>
                      {label}
                    </button>
                  )
                })}
                <button style={treasureBtnStyle} className="primary" disabled={dyingRescueSelected.length === 0} onClick={confirmDyingRescue}>
                  救人
                </button>
                <button style={{ ...treasureBtnStyle, marginLeft: '6px' }} onClick={cancelDyingRescue}>放弃救援</button>
              </div>
            </div>
          )}

          {/* 芦叶枪: 选2张手牌当杀 */}
          {phase === 'selectDualCards' && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(184,134,11,0.18)', borderRadius: '4px',
              border: '1px solid rgba(184,134,11,0.4)',
              color: '#ffd54f', fontSize: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
            }}>
              <span>🎋 芦叶枪 — 请选2张手牌当杀 (已选 {selectedDualCards.length}/2, 选满自动确认)</span>
              <button style={treasureBtnStyle} onClick={cancelDualCards}>取消</button>
            </div>
          )}

          {/* Hand cards */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '6px', flexWrap: 'wrap', alignContent: 'flex-start' }}>
            {playerHand.map(card => {
              const isSelectedDual = selectedDualCards.includes(card.id)
              const isSelectedTreasure = treasureCardIds.includes(card.id)
              const isSelectedYuRen = treasureSkill === 'yu-ren' && yuRenCardIds.includes(card.id)
              const isSelectedDiscard = selectedDiscardCards.includes(card.id)
              const isSelectedFuChou = phase === 'selectFuChouDiscard' && fuChouPickSelected.includes(card.id)
              const isSelectedManWu = manWuSelectedCardId === card.id
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setLastClickedHandCardId(card.id)
                    if (phase === 'selectDualCards') toggleDualCard(card.id)
                    else if (phase === 'selectDiscardCards') toggleDiscardCard(card.id)
                    else if (phase === 'selectFuChouDiscard') toggleFuChouPick(card.id)
                    else if (phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards') pickTreasureCard(card.id)
                    else if (phase === 'treasureSelectEquipment' && card.type === 'equipment') pickTreasureCard(card.id)
                    else if (phase === 'treasureSelectWeapon' && card.type === 'equipment' && (card as any).slot === 'weapon') {
                      // 绝击: 选武器则丢弃, 否则需要cancel+重选
                      const { game, treasureTargetIds } = useBattleStore.getState()
                      const player = game!.getPlayer()!
                      game!.playerJueJi(player, card.id, treasureTargetIds[0])
                      useBattleStore.setState({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], treasureTargetIds: [], gameState: game!.getState(), playerHand: player.getHand() })
                    } else if (phase === 'xiaDanPickCard') {
                      pickXiaDanCard(card.id)
                    } else if (phase === 'tianXiang') {
                      // 天香: 弃这张手牌免判
                      selectTianXiangCard(card.id)
                    } else if (manWuRedHeartCards.length > 0 && manWuRedHeartCards.some(c => c.id === card.id)) {
                      // 曼舞: 标记选中的牌 (需点确定才生效)
                      selectManWuCard(isSelectedManWu ? null : card.id)
                    } else if (phase === 'buDaoKill' && game?.canPlayerUseAsKill(card.id)) {
                      // 补刀: 点击可当杀的牌直接补杀
                      selectBuDaoCard(card.id)
                    }
                  }}
                  style={{
                    outline: (isSelectedDual || isSelectedTreasure || isSelectedYuRen || isSelectedDiscard || isSelectedFuChou || isSelectedManWu) ? '3px solid #b8860b' : 'none',
                    borderRadius: '6px',
                    cursor: (phase === 'selectDualCards' || phase === 'selectDiscardCards' || phase === 'selectFuChouDiscard' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard' || phase === 'tianXiang' || phase === 'buDaoKill' || manWuRedHeartCards.length > 0) ? 'pointer' : undefined,
                  }}
                >
                  <HandCard
                    card={card}
                    disabled={!(isPlayerTurn || phase === 'judgeReplace' || phase === 'awaitingResponse' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard' || phase === 'tianXiang' || phase === 'buDaoKill' || phase === 'selectFuChouDiscard' || huiChunAvailable)}
                    canPlayKill={canPlayKill}
                    isFullHp={isFullHp}
                    aoJianActive={aoJianActive}
                    hasHongZhuang={hasHongZhuang}
                    hasLeiInJudge={hasLeiInJudge}
                    isResponse={phase === 'awaitingResponse'}
                    isJudgeReplace={phase === 'judgeReplace'}
                    isPending={pendingCardId === card.id}
                    isLifted={lastClickedHandCardId === card.id}
                    treasureSelectMode={phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'xiaDanPickCard'}
                    selectDualMode={phase === 'selectDualCards'}
                    selectDiscardMode={phase === 'selectDiscardCards' || phase === 'selectFuChouDiscard'}
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

            {/* 技能按钮行: 主动技能 + 宝具技能 + 傲剑 + 芦叶枪 + 结束出牌 (仅玩家回合显示) */}
            {isPlayerTurn && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-wood)', paddingTop: '6px' }}>
                <span style={{ color: 'var(--text-gold)', fontSize: '12px', fontWeight: 'bold' }}>你的回合</span>

                {/* 主动技能 (玩家可主动发动) */}
                {allSkills.filter(s => s.type === 'active').map(skill => (
                  <button
                    key={skill.id}
                    title={skill.description}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'rgba(255,215,0,0.18)',
                      color: 'var(--text-gold)',
                      border: '1px solid #b8860b',
                      borderRadius: '4px',
                      cursor: 'help',
                    }}
                  >
                    {skill.name}
                  </button>
                ))}

                {/* 被动技能 (灰色, 划过查看描述) */}
                {allSkills.filter(s => s.type === 'passive').map(skill => (
                  <button
                    key={skill.id}
                    title={skill.description}
                    disabled
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted)',
                      border: '1px solid #3a2a1a',
                      borderRadius: '4px',
                      cursor: 'help',
                    }}
                  >
                    {skill.name}
                  </button>
                ))}

                {/* 傲剑 */}
                {hasAoJian && (
                  <button
                    onClick={toggleAoJian}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: aoJianActive ? '#e57373' : 'var(--bg-dark)',
                      color: aoJianActive ? '#fff' : 'var(--text-light)',
                      border: aoJianActive ? '1px solid #e57373' : '1px solid var(--border-wood)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: aoJianActive ? 'bold' : 'normal',
                    }}
                    title="傲剑: 红色牌当杀(包括药)"
                  >
                    {aoJianActive ? '⚔ 傲剑·激活' : '⚔ 傲剑'}
                  </button>
                )}

                {/* 芦叶枪 */}
                {playerWeaponName === '芦叶枪' && canPlayKill && playerHand.length >= 2 && !useBattleStore.getState().pendingCardId && (
                  <button
                    onClick={() => {
                      const { resolveAction } = useBattleStore.getState()
                      if (resolveAction) {
                        resolveAction('luYeQiang:')
                        useBattleStore.setState({ resolveAction: null })
                      }
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: phase === 'selectDualCards' ? 'rgba(184,134,11,0.45)' : 'var(--bg-dark)',
                      color: phase === 'selectDualCards' ? '#ffd54f' : 'var(--text-light)',
                      border: phase === 'selectDualCards' ? '1px solid #ffd54f' : '1px solid var(--border-wood)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: phase === 'selectDualCards' ? 'bold' : 'normal',
                    }}
                    title="芦叶枪: 选择2张手牌当杀"
                  >
                    🎋 芦叶枪
                  </button>
                )}

                {/* 宝具技能 */}
                {hasLiaoShang && (
                  <button onClick={() => useTreasureSkill('liao-shang')} style={treasureBtnStyle} title="疗伤: 弃1张手牌令1名角色回复1血">
                    💊 疗伤
                  </button>
                )}
                {hasZhiYu && (
                  <button onClick={() => useTreasureSkill('zhi-yu')} style={treasureBtnStyle} title="治愈: 弃2张手牌令1名角色回复1血">
                    💊 治愈
                  </button>
                )}
                {hasFengHuo && (
                  <button
                    onClick={() => useTreasureSkill('feng-huo')}
                    style={{
                      ...treasureBtnStyle,
                      background: treasureSkill === 'feng-huo' ? '#b8860b' : treasureBtnStyle.background,
                      color: treasureSkill === 'feng-huo' ? '#fff' : treasureBtnStyle.color,
                      boxShadow: treasureSkill === 'feng-huo' ? '0 0 12px rgba(255,215,0,0.7)' : undefined,
                    }}
                    title="烽火: 弃1张装备视为烽火狼烟"
                  >
                    🔥 烽火{treasureSkill === 'feng-huo' ? ' ·选装备' : ''}
                  </button>
                )}
                {hasJueJi && (
                  <button
                    onClick={() => useTreasureSkill('jue-ji')}
                    disabled={jueJiUsedThisTurn > 0}
                    style={{
                      ...treasureBtnStyle,
                      background: jueJiUsedThisTurn > 0 ? '#444' : (treasureSkill === 'jue-ji' ? '#b8860b' : treasureBtnStyle.background),
                      color: jueJiUsedThisTurn > 0 ? '#888' : (treasureSkill === 'jue-ji' ? '#fff' : treasureBtnStyle.color),
                      cursor: jueJiUsedThisTurn > 0 ? 'not-allowed' : 'pointer',
                      opacity: jueJiUsedThisTurn > 0 ? 0.5 : 1,
                    }}
                    title={jueJiUsedThisTurn > 0 ? '绝击: 本回合已用' : '绝击: 弃装备区或手牌武器, 或受1伤, 令攻击范围内1名角色受1伤 (每回合限1次)'}
                  >
                    ⚔ 绝击{jueJiUsedThisTurn > 0 ? ' ·已用' : ''}
                  </button>
                )}
                {hasQiYi && (
                  <button onClick={() => useTreasureSkill('qi-yi')} style={treasureBtnStyle} title="起义: 放弃摸牌, 改为从至多2名角色各拿1张手牌">
                    ✊ 起义
                  </button>
                )}
                {hasXiaDan && (
                  <button
                    onClick={() => useTreasureSkill('xia-dan')}
                    disabled={xiaDanUsedThisTurn}
                    style={{
                      ...treasureBtnStyle,
                      background: xiaDanActive ? '#b8860b' : (xiaDanUsedThisTurn ? '#444' : treasureBtnStyle.background),
                      color: xiaDanActive ? '#fff' : (xiaDanUsedThisTurn ? '#888' : treasureBtnStyle.color),
                      boxShadow: xiaDanActive ? '0 0 12px rgba(255,215,0,0.7)' : undefined,
                      cursor: xiaDanUsedThisTurn ? 'not-allowed' : 'pointer',
                      opacity: xiaDanUsedThisTurn ? 0.5 : 1,
                    }}
                    title={xiaDanUsedThisTurn ? '侠胆: 本回合已使用' : '侠胆: 点击进入待选状态, 再点1名有手牌的角色拼点, 胜→杀次数=2(每张最多2目标), 负→本回合不能出杀'}
                  >
                    🗡 侠胆{xiaDanActive ? ' ·待选' : (xiaDanUsedThisTurn ? ' ·已用' : '')}
                  </button>
                )}
                {hasYuRen && (
                  <button
                    onClick={() => useTreasureSkill('yu-ren')}
                    disabled={yuRenUsedThisTurn}
                    style={{
                      ...treasureBtnStyle,
                      background: treasureSkill === 'yu-ren' ? '#b8860b' : (yuRenUsedThisTurn ? '#444' : treasureBtnStyle.background),
                      color: treasureSkill === 'yu-ren' ? '#fff' : (yuRenUsedThisTurn ? '#888' : treasureBtnStyle.color),
                      boxShadow: treasureSkill === 'yu-ren' ? '0 0 12px rgba(255,215,0,0.7)' : undefined,
                      cursor: yuRenUsedThisTurn ? 'not-allowed' : 'pointer',
                      opacity: yuRenUsedThisTurn ? 0.5 : 1,
                    }}
                    title={yuRenUsedThisTurn ? '驭人: 本回合已使用' : '驭人: 弃任意张手牌或装备, 然后摸等量牌'}
                  >
                    🎴 驭人{treasureSkill === 'yu-ren' ? ` ·已选${yuRenCardIds.length}张` : (yuRenUsedThisTurn ? ' ·已用' : '')}
                  </button>
                )}
                {hasShiQuan && (
                  <button
                    onClick={() => useTreasureSkill('shi-quan')}
                    style={{
                      ...treasureBtnStyle,
                      background: treasureSkill === 'shi-quan' ? '#b8860b' : treasureBtnStyle.background,
                      color: treasureSkill === 'shi-quan' ? '#fff' : treasureBtnStyle.color,
                      boxShadow: treasureSkill === 'shi-quan' ? '0 0 12px rgba(255,215,0,0.7)' : undefined,
                    }}
                    title="释权: 弃1张黑色手牌或装备区任意牌, 当作【釜底抽薪】使用"
                  >
                    🏛 释权
                  </button>
                )}

                {/* 结束出牌 */}
                <button className="primary" style={{ fontSize: '12px', padding: '4px 12px', marginLeft: 'auto' }} onClick={endPlayPhase}>
                  结束出牌
                </button>
              </div>
            )}
            </div>

          </div>
        </div>
      )}

      {/* 宝具技能 浮层 — 侠胆自己选牌时不要遮挡手牌, 侠胆激活时也无需浮层; 驭人/烽火/绝击用内联提示 */}
      {treasureSkill && phase !== 'xiaDanPickCard' && !xiaDanActive && treasureSkill !== 'yu-ren' && treasureSkill !== 'feng-huo' && treasureSkill !== 'jue-ji' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 90, paddingTop: '20vh',
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #b8860b',
            borderRadius: '12px', padding: '20px 28px', textAlign: 'center', minWidth: '320px',
          }}>
            <div style={{ color: 'var(--text-gold)', fontSize: '16px', marginBottom: '12px' }}>
              {treasurePrompt}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={cancelTreasureSkill}>取消</button>
              {phase === 'treasureSelectTargets' && (
                <button
                  className="primary"
                  disabled={treasureTargetIds.length === 0}
                  onClick={confirmTreasureTargets}
                >
                  确认 ({treasureTargetIds.length}/2)
                </button>
              )}
              {phase === 'treasureSelectWeapon' && (
                <button
                  className="primary"
                  onClick={() => {
                    const { game, treasureTargetIds } = useBattleStore.getState()
                    const player = game!.getPlayer()!
                    game!.playerJueJi(player, null, treasureTargetIds[0])
                    useBattleStore.setState({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], treasureTargetIds: [], gameState: game!.getState(), playerHand: player.getHand() })
                  }}
                >
                  受1血
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 起义: 从每个目标手牌中各选1张 */}
      {phase === 'treasureSelectQiYiCards' && treasureTargetIds.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 95, paddingTop: '10vh',
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #b8860b',
            borderRadius: '12px', padding: '20px 28px', minWidth: '380px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: 'var(--text-gold)', fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>
              ✊ 起义 — 从每个目标手牌中各选1张
            </h2>
            {treasureTargetIds.map(tid => {
              const target = gameState ? (gameState as any).players?.find((p: any) => p.hero.id === tid) : null
              const targetName = target?.hero?.name ?? tid
              const hand: Card[] = target?.handCards ?? []
              const selectedId = qiYiCardMap[tid]
              return (
                <div key={tid} style={{ marginBottom: '14px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>
                    {targetName} 的手牌 {hand.length > 0 ? `(${hand.length}张)` : '(空)'}
                    {selectedId && <span style={{ color: '#b8860b', marginLeft: '8px' }}>✓ 已选</span>}
                  </div>
                  {hand.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {hand.map(card => {
                        const isSelected = selectedId === card.id
                        const color = card.suit === 'spade' || card.suit === 'club' ? '♠' : '♥'
                        const textColor = card.suit === 'spade' || card.suit === 'club' ? '#000' : '#c62828'
                        return (
                          <div
                            key={card.id}
                            onClick={() => pickQiYiCard(tid, card.id)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(184,134,11,0.25)' : 'var(--bg-dark)',
                              border: `2px solid ${isSelected ? '#b8860b' : '#8b6914'}`,
                              borderRadius: '6px', padding: '6px 10px', minWidth: '60px',
                              textAlign: 'center', userSelect: 'none',
                            }}
                          >
                            <div style={{ color: textColor, fontSize: '14px' }}>{color} {card.number}</div>
                            <div style={{ color: 'var(--text-light)', fontSize: '12px', fontWeight: 'bold' }}>{card.name}</div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                      该目标无手牌, 将自动跳过
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
              <button onClick={cancelTreasureSkill}>取消</button>
              <button className="primary" onClick={confirmQiYiCards}>
                确认起义 ({Object.keys(qiYiCardMap).length}/{treasureTargetIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Long Lin Dao 询问浮层 */}
      {phase === 'longLinDisarm' && longLinTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #ff8a65',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#ff8a65', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              龙鳞刀 — 选{longLinTargetInfo.name}至多2张牌弃掉
            </h2>

            {longLinTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌 (位置)</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {longLinTargetInfo.hand.map((card, idx) => {
                    const sel = longLinSelectedCards.includes(card.id)
                    return (
                      <div key={card.id} onClick={() => toggleLongLinCard(card.id)} style={{
                        cursor: 'pointer', background: sel ? 'rgba(255,138,101,0.2)' : 'var(--bg-dark)',
                        border: `1px solid ${sel ? '#ff8a65' : '#8b6914'}`,
                        borderRadius: '6px', padding: '8px 12px', minWidth: '60px', textAlign: 'center', userSelect: 'none',
                      }}>
                        <div style={{ color: 'var(--text-light)', fontSize: '15px', fontWeight: 'bold' }}>位置 {idx + 1}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {longLinTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {longLinTargetInfo.judge.map(card => {
                    const sel = longLinSelectedCards.includes(card.id)
                    return (
                      <div key={card.id} onClick={() => toggleLongLinCard(card.id)} style={{
                        cursor: 'pointer', border: sel ? '2px solid #ff8a65' : 'none',
                        borderRadius: '6px',
                      }}>
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {longLinTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {longLinTargetInfo.equipment.map(card => {
                    const sel = longLinSelectedCards.includes(card.id)
                    return (
                      <div key={card.id} onClick={() => toggleLongLinCard(card.id)} style={{
                        cursor: 'pointer', border: sel ? '2px solid #ff8a65' : 'none',
                        borderRadius: '6px',
                      }}>
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
              <button
                onClick={cancelLongLinPick}
                style={{ padding: '10px 20px', background: '#e57373', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                正常掉血
              </button>
              <button
                onClick={confirmLongLinPick}
                disabled={longLinSelectedCards.length === 0}
                style={{
                  padding: '10px 20px', background: longLinSelectedCards.length > 0 ? '#64b5f6' : '#555',
                  color: '#fff', border: 'none', borderRadius: '6px', cursor: longLinSelectedCards.length > 0 ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 'bold',
                }}
              >
                弃{longLinSelectedCards.length > 0 ? `${longLinSelectedCards.length}张牌` : '牌'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 五谷丰登 选牌浮层 */}
      {phase === 'selectWugu' && wuguCandidates && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #ffd54f',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '640px',
          }}>
            <h2 style={{ color: '#ffd54f', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              🌾 五谷丰登
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
              从候选牌中选1张 (你优先选)
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
              {wuguCandidates.map(card => (
                <div key={card.id} onClick={() => selectWuguCard(card.id)} style={{ cursor: 'pointer' }}>
                  <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={cancelWuguPick}>放弃</button>
            </div>
          </div>
        </div>
      )}

      {/* 探囊取物 选目标牌浮层 */}
      {phase === 'selectTanNangCard' && tanNangTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #64b5f6',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#64b5f6', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              🎒 探囊取物 — 选{tanNangTargetInfo.name}的1张牌
            </h2>

            {tanNangTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{
                      cursor: 'pointer',
                      background: 'var(--bg-dark)',
                      border: '1px solid #8b6914',
                      borderRadius: '6px',
                      padding: '22px 8px 8px',
                      minWidth: '60px',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '20px', fontWeight: 'bold', margin: '2px 0 6px' }}>{idx + 1}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>手牌</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tanNangTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.judge.map(card => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {tanNangTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.equipment.map(card => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {tanNangTargetInfo.hand.length === 0 && tanNangTargetInfo.judge.length === 0 && tanNangTargetInfo.equipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>无可拿的牌</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => cancelTanNangCard()}>不拿</button>
            </div>
          </div>
        </div>
      )}

      {/* 釜底抽薪 选目标牌浮层 (弃牌) */}
      {phase === 'selectFudiCard' && fudiTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #e57373',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#e57373', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              🔥 釜底抽薪 — 弃{fudiTargetInfo.name}的1张牌
            </h2>

            {fudiTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{
                      cursor: 'pointer',
                      background: 'var(--bg-dark)',
                      border: '1px solid #e57373',
                      borderRadius: '6px',
                      padding: '22px 8px 8px',
                      minWidth: '60px',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '20px', fontWeight: 'bold', margin: '2px 0 6px' }}>{idx + 1}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>手牌</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {fudiTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.judge.map(card => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {fudiTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.equipment.map(card => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {fudiTargetInfo.hand.length === 0 && fudiTargetInfo.judge.length === 0 && fudiTargetInfo.equipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>无可弃的牌</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => cancelFudiCard()}>不弃</button>
            </div>
          </div>
        </div>
      )}

      {/* 法家 选伤害来源的牌浮层 */}
      {phase === 'selectFaJiaCard' && faJiaTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #ce93d8',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#ce93d8', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              法家 — 选{faJiaTargetInfo.name}的1张牌
            </h2>

            {faJiaTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {faJiaTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectFaJiaCard(card.id)} style={{
                      cursor: 'pointer',
                      background: 'var(--bg-dark)',
                      border: '1px solid #8b6914',
                      borderRadius: '6px',
                      padding: '22px 8px 8px',
                      minWidth: '60px',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '20px', fontWeight: 'bold', margin: '2px 0 6px' }}>{idx + 1}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>手牌</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {faJiaTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {faJiaTargetInfo.judge.map(card => (
                    <div key={card.id} onClick={() => selectFaJiaCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {faJiaTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {faJiaTargetInfo.equipment.map(card => (
                    <div key={card.id} onClick={() => selectFaJiaCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {faJiaTargetInfo.hand.length === 0 && faJiaTargetInfo.judge.length === 0 && faJiaTargetInfo.equipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>无可拿的牌</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => cancelFaJiaCard()}>不拿</button>
            </div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {phase === 'ended' && result && !resultOverlayDismissed && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid var(--border-gold)',
            borderRadius: '12px', padding: '30px', textAlign: 'center', minWidth: '300px',
            position: 'relative',
          }}>
            <button
              onClick={() => setResultOverlayDismissed(true)}
              style={{
                position: 'absolute', top: '8px', right: '12px',
                background: 'transparent', color: 'var(--text-muted)',
                border: '1px solid var(--border-wood)', borderRadius: '4px',
                padding: '2px 10px', cursor: 'pointer', fontSize: '14px',
              }}
              title="关闭弹窗查看战斗记录"
            >
              ✕
            </button>
            <h2 style={{ color: result.won ? 'var(--text-gold)' : '#f44336', fontSize: '28px', marginBottom: '12px' }}>
              {result.won ? '胜利!' : '失败!'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>回合数: {result.turnCount}</p>
            {result.won && (
              <p style={{ color: 'var(--text-gold)' }}>
                奖励: {result.rewards.gold} 金币, {result.rewards.growthValue} 成长值
              </p>
            )}
          </div>
        </div>
      )}

      {/* 判定结果中央高亮显示 (2.5秒后自动消失) */}
      {lastJudgeResult && (
        <div style={{
          position: 'fixed', left: '50%', top: '40%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          animation: 'judgePopup 0.3s ease-out',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(218,165,32,0.95), rgba(184,134,11,0.95))',
            color: '#1a1a1a', padding: '6px 18px', borderRadius: '20px',
            fontSize: '14px', fontWeight: 'bold',
            border: '2px solid #ffd700', boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}>
            {lastJudgeResult.judgeHeroName && `【${lastJudgeResult.judgeHeroName}】 `}
            {lastJudgeResult.judgeCardName ? `判定【${lastJudgeResult.judgeCardName}】` : '判定结果'}
          </div>
          <div style={{
            background: 'var(--bg-dark)', color: 'var(--text-light)',
            padding: '14px 22px', borderRadius: '10px',
            border: '3px solid #ffd700', boxShadow: '0 0 24px rgba(255,215,0,0.5), 0 4px 16px rgba(0,0,0,0.6)',
            fontSize: '20px', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', gap: '12px',
            minWidth: '160px', justifyContent: 'center',
          }}>
            <span style={{ color: lastJudgeResult.resultCard.suit === 'spade' || lastJudgeResult.resultCard.suit === 'club' ? '#fff' : '#e57373', fontSize: '28px' }}>
              {({ spade: '♠', heart: '♥', diamond: '♦', club: '♣' } as any)[lastJudgeResult.resultCard.suit] ?? ''}
            </span>
            <span>{lastJudgeResult.resultCard.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              {lastJudgeResult.resultCard.number > 13 ? '' : lastJudgeResult.resultCard.number === 1 ? 'A' : lastJudgeResult.resultCard.number > 10 ? ['J','Q','K'][lastJudgeResult.resultCard.number - 11] : lastJudgeResult.resultCard.number}
            </span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes judgePopup {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      </div>
    </div>
  )
}
