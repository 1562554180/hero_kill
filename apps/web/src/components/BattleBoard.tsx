import { useState } from 'react'
import { useBattleStore } from '../stores/battleStore'
import { HeroBattleCard } from './HeroBattleCard'
import { HandCard } from './HandCard'
import { BattleLog } from './BattleLog'

export function BattleBoard() {
  const [resultOverlayDismissed, setResultOverlayDismissed] = useState(false)
  const {
    gameState, phase, playerHand, actionLog, result, equippedCards, pendingCardId, pendingCardType,
    playKill, playScheme, playSchemeSelf, confirmTarget, playHeal, equipCard, endPlayPhase, cancelSelection, game,
    judgeReplace, judgeCard, aoJianActive, responsePrompt, toggleAoJian, respondWithCard,
    multiTargetCandidates, selectedTargets, toggleTarget, confirmMultiTarget, cancelMultiTarget,
    killMultiMax, killMultiRemaining, toggleKillMultiTarget, confirmKillMultiTarget, cancelKillMultiTarget,
    selectedDualCards, toggleDualCard, confirmDualCards, cancelDualCards,
    longLinTargetInfo, longLinSelectedCards, toggleLongLinCard, confirmLongLinPick, cancelLongLinPick,
    jieDaoHolders, jieDaoCandidates, selectJieDaoHolder, cancelJieDaoHolder, selectJieDaoTarget, cancelJieDaoTarget,
    tanNangCandidates, tanNangTargetInfo, selectTanNangTarget, cancelTanNangTarget, selectTanNangCard, cancelTanNangCard,
    wuguCandidates, selectWuguCard, cancelWuguPick,
    fudiTargetInfo, selectFudiTarget, cancelFudiTarget, selectFudiCard, cancelFudiCard,
    treasureSkill, treasurePrompt, treasureCardIds, treasureTargetIds,
    useTreasureSkill, pickTreasureCard, pickTreasureTarget, confirmTreasureTargets, cancelTreasureSkill,
    xiaDanOpponentCard, xiaDanTargetName, pickXiaDanCard, cancelXiaDanCard, xiaDanActive, cancelXiaDan,
    xiaDanUsedThisTurn,
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
    if (phase === 'selectTarget' && pendingCardType === 'kill') {
      return game.isInAttackRange(attacker, target)
    }
    if (phase === 'selectTarget' && pendingCardType === 'scheme' && pendingSchemeName === '探囊取物') {
      return game.canTanNang(attacker, target)
    }
    if (phase === 'selectTarget' && pendingCardType === 'scheme' && pendingSchemeCard) {
      // 洞察: 黑桃锦囊 (排除延时锦囊) 对拥有此技能的目标无效
      return game.canBeSchemeTarget(target, pendingSchemeCard)
    }
    return true
  }
  // 选目标阶段是否应启用 dim 效果 (出杀/锦囊)
  const dimInvalidTargets = phase === 'selectTarget' && game && player && (
    pendingCardType === 'kill' || (pendingCardType === 'scheme' && pendingSchemeName === '探囊取物')
  )

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards'
  const canPlayKill = game?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true

  const playerHero = player?.instance
  const allSkills = player?.hero.skills ?? []
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
  const hasJueJi = hasSkillOrTreasure('jue-ji')
  const hasQiYi = hasSkillOrTreasure('qi-yi')
  const hasXiaDan = hasSkillOrTreasure('xia-dan')
  // 当前玩家装备的武器名
  const playerWeaponName = (() => {
    const weaponId = player?.equipment?.weapon
    if (!weaponId) return undefined
    // 从store里查
    const equipped = useBattleStore.getState().equippedCards[player?.hero.id ?? '']?.weapon
    return equipped?.name
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Enemy area */}
      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>敌方</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {enemies.map(h => (
            <HeroBattleCard
              key={h.hero.id}
              hero={h}
              isCurrentTurn={gameState.currentHeroId === h.hero.id && !isPlayerTurn}
              isSelectable={
                (h.currentHp > 0 && !(xiaDanActive && h.handCards.length === 0)) &&
                (
                  (phase === 'selectTarget' && isValidTarget(h.hero.id)) ||
                  (phase === 'selectMultiTargets') ||
                  (phase === 'selectKillMultiTargets') ||
                  (phase === 'selectJieDaoHolder' && jieDaoHolders.some(jh => jh.id === h.hero.id)) ||
                  (phase === 'selectJieDaoTarget' && jieDaoCandidates.some(jc => jc.id === h.hero.id)) ||
                  (phase === 'treasureSelectTarget') ||
                  (phase === 'treasureSelectTargets')
                )
              }
              dimmed={
                !!dimInvalidTargets && !isValidTarget(h.hero.id)
              }
              onClick={() => {
                if (phase === 'selectTarget') confirmTarget(h.hero.id)
                else if (phase === 'selectMultiTargets') toggleTarget(h.hero.id)
                else if (phase === 'selectKillMultiTargets') toggleKillMultiTarget(h.hero.id)
                else if (phase === 'selectJieDaoHolder') {
                  if (jieDaoHolders.some(jh => jh.id === h.hero.id)) selectJieDaoHolder(h.hero.id)
                }
                else if (phase === 'selectJieDaoTarget') selectJieDaoTarget(h.hero.id)
                else if (phase === 'selectTanNangTarget') selectTanNangTarget(h.hero.id)
                else if (phase === 'selectFudiTarget') selectFudiTarget(h.hero.id)
                else if (phase === 'treasureSelectTarget') pickTreasureTarget(h.hero.id)
                else if (phase === 'treasureSelectTargets') {
                  // 起义: toggle target selection
                  const t = treasureTargetIds
                  if (t.includes(h.hero.id)) {
                    useBattleStore.setState({ treasureTargetIds: t.filter(id => id !== h.hero.id) })
                  } else if (t.length < 2 && h.hero.id !== player?.hero.id) {
                    useBattleStore.setState({ treasureTargetIds: [...t, h.hero.id] })
                  }
                }
              }}
            />
          ))}
        </div>
        {phase === 'selectTarget' && (
          <div style={{
            marginTop: '6px', padding: '6px 12px',
            background: 'rgba(255,68,68,0.15)', borderRadius: '4px',
            border: '1px solid rgba(255,68,68,0.3)',
            color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
          }}>
            点击敌方英雄选择攻击目标
          </div>
        )}
        {phase === 'selectMultiTargets' && (
          <div style={{
            marginTop: '6px', padding: '8px 12px',
            background: 'rgba(255,140,0,0.15)', borderRadius: '4px',
            border: '1px solid rgba(255,140,0,0.3)',
            color: '#ffa726', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>🐺 狼牙棒 — 点击敌方选择目标 (最多3个, 已选 {selectedTargets.length}/3)</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{ fontSize: '12px' }} onClick={cancelMultiTarget}>取消</button>
              <button
                className="primary"
                style={{ fontSize: '12px' }}
                disabled={selectedTargets.length === 0}
                onClick={confirmMultiTarget}
              >
                出杀
              </button>
            </div>
          </div>
        )}
        {phase === 'selectKillMultiTargets' && (
          <div style={{
            marginTop: '6px', padding: '8px 12px',
            background: 'rgba(255,215,0,0.15)', borderRadius: '4px',
            border: '1px solid rgba(255,215,0,0.3)',
            color: '#ffd54f', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>🗡️ 侠胆 — 点击敌方选择目标 (最多 {killMultiMax || 2} 个, 已选 {selectedTargets.length}/{killMultiMax || 2}; 剩余 {killMultiRemaining} 次出杀)</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{ fontSize: '12px' }} onClick={cancelKillMultiTarget}>取消</button>
              <button
                className="primary"
                style={{ fontSize: '12px' }}
                disabled={selectedTargets.length === 0}
                onClick={confirmKillMultiTarget}
              >
                出杀
              </button>
            </div>
          </div>
        )}
        {phase === 'selectJieDaoHolder' && (
          <div style={{
            marginTop: '6px', padding: '6px 12px',
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
            marginTop: '6px', padding: '6px 12px',
            background: 'rgba(255,68,68,0.15)', borderRadius: '4px',
            border: '1px solid rgba(255,68,68,0.3)',
            color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
          }}>
            借刀杀人 — 选择被借刀玩家的攻击目标
            <button style={{ fontSize: '12px', marginLeft: '12px' }} onClick={cancelJieDaoTarget}>取消</button>
          </div>
        )}
      </div>

      {/* Battle log */}
      <BattleLog logs={actionLog} />

      {/* Ally area */}
      {allies.length > 0 && (
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>友军</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allies.map(h => (
              <HeroBattleCard
                key={h.hero.id}
                hero={h}
                isCurrentTurn={gameState.currentHeroId === h.hero.id && !isPlayerTurn}
                isSelectable={
                  (h.currentHp > 0 && !(xiaDanActive && h.handCards.length === 0)) &&
                  ((phase === 'treasureSelectTarget') || (phase === 'treasureSelectTargets') ||
                   (phase === 'selectJieDaoTarget' && jieDaoCandidates.some(jc => jc.id === h.hero.id)))
                }
                onClick={() => {
                  if (phase === 'treasureSelectTarget') pickTreasureTarget(h.hero.id)
                  else if (phase === 'selectJieDaoTarget') selectJieDaoTarget(h.hero.id)
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
            ))}
          </div>
        </div>
      )}

      {/* Player area */}
      {player && (
        <div style={{
          background: 'var(--bg-medium)',
          border: '1px solid var(--border-wood)',
          borderRadius: '8px',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
            {phase === 'selectTarget' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 'bold' }}>
                  {useBattleStore.getState().pendingCardType === 'scheme' ? '选择锦囊目标' : '选择攻击目标'}
                </span>
                <button style={{ fontSize: '12px' }} onClick={cancelSelection}>取消</button>
              </div>
            ) : phase === 'judgeReplace' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64b5f6', fontSize: '14px', fontWeight: 'bold' }}>
                  变法 — 点击手牌替换判定牌
                </span>
                <button style={{ fontSize: '12px' }} onClick={() => judgeReplace(null)}>跳过</button>
              </div>
            ) : phase === 'awaitingResponse' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: '#ff9800', fontSize: '14px', fontWeight: 'bold' }}>
                  {responsePrompt || '请响应'}
                </span>
                {hasAoJian && (
                  <button
                    onClick={toggleAoJian}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
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
                <button style={{ fontSize: '12px' }} onClick={() => respondWithCard(null)}>放弃</button>
              </div>
            ) : phase === 'selectDualCards' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64b5f6', fontSize: '14px', fontWeight: 'bold' }}>
                  🎋 芦叶枪 — 选择2张手牌当杀 (已选 {selectedDualCards.length}/2)
                </span>
                <button style={{ fontSize: '12px' }} onClick={cancelDualCards}>取消</button>
                <button
                  className="primary"
                  style={{ fontSize: '12px' }}
                  disabled={selectedDualCards.length !== 2}
                  onClick={confirmDualCards}
                >
                  出杀
                </button>
              </div>
            ) : isPlayerTurn ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>你的回合 - 点击手牌出牌</span>
                {hasAoJian && (
                  <button
                    onClick={toggleAoJian}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
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
                {playerWeaponName === '芦叶枪' && playerHand.length >= 2 && !useBattleStore.getState().pendingCardId && (
                  <button
                    onClick={() => {
                      const { resolveAction } = useBattleStore.getState()
                      if (resolveAction) {
                        resolveAction('luYeQiang:')
                        useBattleStore.setState({ resolveAction: null })
                      }
                    }}
                    disabled={!canPlayKill}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: canPlayKill ? 'var(--bg-dark)' : '#444',
                      color: canPlayKill ? 'var(--text-light)' : '#888',
                      border: '1px solid var(--border-wood)',
                      borderRadius: '4px',
                      cursor: canPlayKill ? 'pointer' : 'not-allowed',
                      opacity: canPlayKill ? 1 : 0.5,
                    }}
                    title={canPlayKill ? '芦叶枪: 选2张手牌当杀' : '芦叶枪: 本回合杀次数已用尽'}
                  >
                    🎋 芦叶枪
                  </button>
                )}
                {/* 主印宝具技能按钮 */}
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
                  <button onClick={() => useTreasureSkill('feng-huo')} style={treasureBtnStyle} title="烽火: 弃1张装备视为烽火狼烟">
                    🔥 烽火
                  </button>
                )}
                {hasJueJi && (
                  <button onClick={() => useTreasureSkill('jue-ji')} style={treasureBtnStyle} title="绝击: 弃武器或受1伤, 令攻击范围内1名角色受1伤">
                    ⚔ 绝击
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
                <button className="primary" style={{ fontSize: '14px' }} onClick={endPlayPhase}>
                  结束出牌
                </button>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>等待中...</span>
            )}
          </div>

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

          {/* Hand cards */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {playerHand.map(card => {
              const isSelectedDual = selectedDualCards.includes(card.id)
              const isSelectedTreasure = treasureCardIds.includes(card.id)
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (phase === 'selectDualCards') toggleDualCard(card.id)
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
                    }
                  }}
                  style={{
                    outline: (isSelectedDual || isSelectedTreasure) ? '3px solid #b8860b' : 'none',
                    borderRadius: '6px',
                    cursor: (phase === 'selectDualCards' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard') ? 'pointer' : undefined,
                  }}
                >
                  <HandCard
                    card={card}
                    disabled={!(isPlayerTurn || phase === 'judgeReplace' || phase === 'awaitingResponse' || phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'treasureSelectWeapon' || phase === 'xiaDanPickCard') || phase === 'selectTarget'}
                    canPlayKill={canPlayKill}
                    isFullHp={isFullHp}
                    aoJianActive={aoJianActive}
                    hasHongZhuang={hasHongZhuang}
                    isResponse={phase === 'awaitingResponse'}
                    isJudgeReplace={phase === 'judgeReplace'}
                    isPending={(phase === 'selectTarget' || phase === 'selectJieDaoHolder' || phase === 'selectTanNangTarget' || phase === 'selectFudiTarget' || phase === 'selectJieDaoTarget' || phase === 'selectDualCards') && pendingCardId === card.id}
                    treasureSelectMode={phase === 'treasureSelectCard' || phase === 'treasureSelect2Cards' || phase === 'treasureSelectEquipment' || phase === 'xiaDanPickCard'}
                    onPlayKill={playKill}
                    onPlayHeal={playHeal}
                    onEquip={equipCard}
                    onPlayScheme={playScheme}
                    onPlaySchemeSelf={playSchemeSelf}
                    onJudgeReplace={judgeReplace}
                    onRespondWithCard={respondWithCard}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 宝具技能 浮层 — 侠胆自己选牌时不要遮挡手牌, 侠胆激活时也无需浮层 */}
      {treasureSkill && phase !== 'xiaDanPickCard' && !xiaDanActive && (
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
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
                  <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌 (位置)</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{
                      cursor: 'pointer',
                      background: 'var(--bg-dark)',
                      border: '1px solid #8b6914',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      minWidth: '60px',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '15px', fontWeight: 'bold' }}>位置 {idx + 1}</div>
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
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌 (位置)</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{
                      cursor: 'pointer',
                      background: 'var(--bg-dark)',
                      border: '1px solid #e57373',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      minWidth: '60px',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '15px', fontWeight: 'bold' }}>位置 {idx + 1}</div>
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
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} onPlayKill={() => {}} onPlayHeal={() => {}} onEquip={() => {}} />
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
  )
}
