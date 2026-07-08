import { useMemo } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'

const treasureBtnStyle = {
  fontSize: '11px',
  padding: '4px 10px',
  background: 'var(--bg-dark)',
  color: 'var(--text-light)',
  border: '1px solid #b8860b',
  borderRadius: '4px',
  cursor: 'pointer',
} as const

export function SkillBar() {
  const s = useBattleStore(useShallow(st => ({
    phase: st.phase,
    treasureSkill: st.treasureSkill,
    playerHand: st.playerHand,
    gameState: st.gameState,
    pendingCardId: st.pendingCardId,
    pendingCardType: st.pendingCardType,
    equippedCards: st.equippedCards,
    xiaDanActive: st.xiaDanActive,
    xiaDanUsedThisTurn: st.xiaDanUsedThisTurn,
    yuRenUsedThisTurn: st.yuRenUsedThisTurn,
    yuRenCardIds: st.yuRenCardIds,
    derived: st.derived,
    aoJianActive: st.aoJianActive,
    toggleAoJian: st.toggleAoJian,
    toggleShenTou: st.toggleShenTou,
    useTreasureSkill: st.useTreasureSkill,
    endPlayPhase: st.endPlayPhase,
  })))

  const {
    phase, treasureSkill, playerHand, gameState,
    pendingCardId, pendingCardType, equippedCards,
    xiaDanActive, xiaDanUsedThisTurn, yuRenUsedThisTurn, yuRenCardIds,
    derived, aoJianActive, toggleAoJian, toggleShenTou, useTreasureSkill, endPlayPhase,
  } = s

  const player = useMemo(() => gameState?.heroes.find(h => h.role === 'player'), [gameState])
  const playerHero = player?.instance

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget' || phase === 'selectDualCards' || phase === 'selectLuYeQiangTarget' || phase === 'treasureSelectEquipment' || phase === 'sheShenTrigger' || phase === 'awaitingResponse'

  const canPlayKill = derived?.canPlayKill ?? false

  const allSkills = player?.hero.skills ?? []
  const allTreasures = [
    ...(playerHero?.treasures?.main ?? []),
    ...(playerHero?.treasures?.sub ?? []),
  ].filter(Boolean)
  const hasSkillOrTreasure = (id: string) =>
    allSkills.some(sk => sk.id === id) || allTreasures.some(t => t?.skill.id === id || t?.skill.id === `treasure-${id}`)

  const hasAoJian = hasSkillOrTreasure('ao-jian')
  const hasLiaoShang = hasSkillOrTreasure('liao-shang')
  const hasZhiYu = hasSkillOrTreasure('zhi-yu')
  const hasFengHuo = hasSkillOrTreasure('feng-huo')
  const hasYuRen = hasSkillOrTreasure('yu-ren')
  const hasShiQuan = hasSkillOrTreasure('shi-quan')
  const hasJueJi = hasSkillOrTreasure('jue-ji')
  const hasXiaDan = hasSkillOrTreasure('xia-dan')
  const hasFuJing = hasSkillOrTreasure('fu-jing')
  const hasShenTou = hasSkillOrTreasure('shen-tou')
  const shenTouActive = derived?.shenTouActive ?? false

  const playerWeaponName = (() => {
    const weaponId = player?.equipment?.weapon
    if (!weaponId) return undefined
    const equipped = equippedCards[player?.hero.id ?? '']?.weapon
    return equipped?.name
  })()

  const jueJiUsedThisTurn = derived?.jueJiUsedCount ?? 0

  return (
    <div style={{ position: 'relative', borderTop: '1px solid var(--border-wood)', paddingTop: '6px' }}>
      <div style={{
        display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
        pointerEvents: 'auto',
      }}>
        {isPlayerTurn && (
          <span style={{ color: 'var(--text-gold)', fontSize: '12px', fontWeight: 'bold' }}>你的回合</span>
        )}

        {allSkills.filter(sk => sk.type === 'active').map(skill => (
          <button
            key={skill.id}
            title={skill.description}
            style={{
              fontSize: '11px', padding: '4px 10px',
              background: 'rgba(255,215,0,0.18)',
              color: 'var(--text-gold)',
              border: '1px solid #b8860b', borderRadius: '4px',
              cursor: 'help',
            }}
          >
            {skill.name}
          </button>
        ))}

        {allSkills.filter(sk => sk.type === 'passive').map(skill => (
          <button
            key={skill.id}
            title={skill.description}
            disabled
            style={{
              fontSize: '11px', padding: '4px 10px',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-muted)',
              border: '1px solid #3a2a1a', borderRadius: '4px',
              cursor: 'help',
            }}
          >
            {skill.name}
          </button>
        ))}

        {hasAoJian && (
          <button
            onClick={toggleAoJian}
            style={{
              fontSize: '11px', padding: '4px 10px',
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

        {playerWeaponName === '芦叶枪' && canPlayKill && playerHand.length >= 2 && !pendingCardId && (
          <button
            onClick={() => {
              const { resolveAction } = useBattleStore.getState()
              if (resolveAction) {
                resolveAction('luYeQiang:')
                useBattleStore.setState({ resolveAction: null })
              }
            }}
            style={{
              fontSize: '11px', padding: '4px 10px',
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
        {hasFengHuo && (() => {
          const playerHasEquip = derived?.playerHasEquipment ?? false
          const isActive = treasureSkill === 'feng-huo'
          const isDisabled = !playerHasEquip
          return (
            <button
              onClick={() => useTreasureSkill('feng-huo')}
              disabled={isDisabled}
              style={{
                ...treasureBtnStyle,
                background: isActive ? '#b8860b' : (isDisabled ? '#444' : treasureBtnStyle.background),
                color: isActive ? '#fff' : (isDisabled ? '#888' : treasureBtnStyle.color),
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                boxShadow: isActive ? '0 0 12px rgba(255,215,0,0.7)' : undefined,
              }}
              title={isDisabled ? '烽火: 装备区无牌可弃' : '烽火: 弃1张装备视为烽火狼烟'}
            >
              🔥 烽火{isActive ? ' ·选装备' : ''}
            </button>
          )
        })()}
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
        {hasFuJing && (
          <button
            onClick={() => useTreasureSkill('fu-jing')}
            style={{
              fontSize: '11px', padding: '4px 10px',
              background: 'var(--bg-dark)',
              color: 'var(--text-light)',
              border: '1px solid var(--border-wood)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="负荆: 主动掉1血, 然后摸2张牌 (无次数限制). 1血发动先进入濒死, 被救活后照常摸牌"
          >
            🩸 负荆
          </button>
        )}
        {hasShenTou && (
          <button
            onClick={toggleShenTou}
            style={{
              fontSize: '11px', padding: '4px 10px',
              background: shenTouActive ? '#7ec850' : 'var(--bg-dark)',
              color: shenTouActive ? '#fff' : 'var(--text-light)',
              border: shenTouActive ? '1px solid #7ec850' : '1px solid var(--border-wood)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: shenTouActive ? 'bold' : 'normal',
            }}
            title="神偷: 激活后所有♣梅花手牌都当【探囊取物】使用"
          >
            {shenTouActive ? '🃏 神偷·激活' : '🃏 神偷'}
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
            title={xiaDanUsedThisTurn ? '侠胆: 本回合已使用' : '侠胆: 点击进入待选状态, 再点1名有手牌的角色拼点, 胜→本回合每张杀可指定2目标(无视距离)+杀次数+1, 负→本回合不能出杀'}
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

        {isPlayerTurn && (
          <button className="primary" style={{ fontSize: '11px', padding: '4px 10px', marginLeft: 'auto' }} onClick={endPlayPhase}>
            结束出牌
          </button>
        )}
      </div>
    </div>
  )
}
