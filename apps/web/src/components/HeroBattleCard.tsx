import type { BattleHero, Card } from '@hero-legend/shared-types'
import { isRedSuit } from '@hero-legend/shared-types'
import { useBattleStore } from '../stores/battleStore'

interface Props {
  hero: BattleHero
  isCurrentTurn: boolean
  isSelectable: boolean
  dimmed?: boolean
  onClick?: () => void
  aoJianActive?: boolean
  canPlayKill?: boolean
  onEquipAsKill?: (cardId: string) => void
  hasHongZhuang?: boolean
}

export function HeroBattleCard({ hero, isCurrentTurn, isSelectable, dimmed, onClick, aoJianActive, canPlayKill, onEquipAsKill, hasHongZhuang }: Props) {
  const game = useBattleStore(s => s.game)
  const phase = useBattleStore(s => s.phase)
  const treasureSkill = useBattleStore(s => s.treasureSkill)
  const pickTreasureCard = useBattleStore(s => s.pickTreasureCard)
  const { hero: config, currentHp, maxHp, role, instance } = hero
  const hpPercent = (currentHp / maxHp) * 100
  const hpColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#f44336'

  const borderColor = isSelectable
    ? '#ff4444'
    : isCurrentTurn
      ? 'var(--border-gold)'
      : role === 'enemy' ? '#8b4513' : '#3a5a3a'

  const skills = config.skills ?? []
  const mainTreasures = (instance.treasures?.main ?? []).filter(Boolean)
  const subTreasures = (instance.treasures?.sub ?? []).filter(Boolean)

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      style={{
        background: 'var(--bg-medium)',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '8px 12px',
        minWidth: '140px',
        opacity: currentHp > 0 ? (dimmed ? 0.4 : 1) : 0.4,
        cursor: isSelectable ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        position: 'relative',
        boxShadow: isSelectable
          ? '0 0 10px rgba(255,68,68,0.5), inset 0 0 6px rgba(255,68,68,0.2)'
          : isCurrentTurn
            ? '0 0 8px rgba(218,165,32,0.4)'
            : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-light)', fontWeight: 'bold', fontSize: '14px' }}>
          {config.name}
        </span>
        <span style={{ color: 'var(--text-gold)', fontSize: '11px' }}>
          {'★'.repeat(instance.starLevel)}
        </span>
      </div>

      {/* 技能 */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {skills.map(s => (
            <span key={s.id} style={{
              fontSize: '10px', color: '#ffd54f',
              background: 'rgba(255,213,79,0.12)',
              padding: '1px 5px', borderRadius: '3px',
              border: '1px solid rgba(255,213,79,0.25)',
            }}>
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* 主印 */}
      {mainTreasures.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '2px' }}>
          {mainTreasures.map((t, i) => t && (
            <span key={t.id} title={t.skill.description} style={{
              fontSize: '10px', color: '#ff8a65',
              background: 'rgba(255,138,101,0.12)',
              padding: '1px 5px', borderRadius: '3px',
              border: '1px solid rgba(255,138,101,0.25)',
            }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* 辅印 */}
      {subTreasures.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '2px' }}>
          {subTreasures.map((t, i) => t && (
            <span key={t.id} title={t.skill.description} style={{
              fontSize: '10px', color: '#90caf9',
              background: 'rgba(144,202,249,0.12)',
              padding: '1px 5px', borderRadius: '3px',
              border: '1px solid rgba(144,202,249,0.25)',
            }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
        <div style={{
          flex: 1, height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${hpPercent}%`, height: '100%', background: hpColor, borderRadius: '4px',
            transition: 'width 0.3s',
          }} />
        </div>
        <span style={{ color: hpColor, fontSize: '11px', whiteSpace: 'nowrap' }}>
          {currentHp}/{maxHp}
        </span>
      </div>

      {/* 装备区: 只显示图标, hover 显示名称+描述; 交互状态下高亮可点击 */}
      {(() => {
        const p = game?.getPlayerById(hero.hero.id)
        const slots: { slot: 'weapon' | 'armor' | 'attackMount' | 'defenseMount' }[] = [
          { slot: 'weapon' },
          { slot: 'armor' },
          { slot: 'attackMount' },
          { slot: 'defenseMount' },
        ]
        const isSelectingEquipment = phase === 'treasureSelectEquipment' || (treasureSkill === 'yu-ren' && phase === 'treasureSelectCard')
        const isYuRen = treasureSkill === 'yu-ren' && phase === 'treasureSelectCard'
        const isJueJiWeaponPick = treasureSkill === 'jue-ji' && phase === 'treasureSelectWeapon'
        return (
          <>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              手牌: {hero.handCards.length}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', fontSize: '10px' }}>
              {slots.map(s => {
              const id = hero.equipment[s.slot]
              if (!id) return null
              const card = p?.getEquippedCard(s.slot)
              const name = card?.name ?? '???'
              const desc = (card as any)?.description ?? ''
              const icon = (card as any)?.icon ?? '⚙'
              const isRed = !!card && isRedSuit(card.suit)
              // 傲剑: 红色武器当杀
              const canActivate = s.slot === 'weapon' && aoJianActive && isRed && !!canPlayKill && !!card
              // 绝击: 选武器
              const isJueJiThis = isJueJiWeaponPick && s.slot === 'weapon' && !!card
              // 驭人/烽火: 选装备
              const isPickingEquip = isSelectingEquipment && !!card
              const defaultColor = s.slot === 'weapon' ? '#ff8a65' : s.slot === 'armor' ? '#90caf9' : '#a5d6a7'
              const activeColor = isYuRen ? '#b8860b' : '#ff9800'
              const color = canActivate ? '#e57373' : isJueJiThis ? '#ff5722' : isPickingEquip ? activeColor : defaultColor
              const handleClick = canActivate
                ? () => onEquipAsKill?.(card!.id)
                : isJueJiThis
                  ? () => {
                      const { game: g, treasureTargetIds } = useBattleStore.getState()
                      const player = g!.getPlayer()!
                      g!.playerJueJi(player, card!.id, treasureTargetIds[0])
                      useBattleStore.setState({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], treasureTargetIds: [], gameState: g!.getState(), playerHand: player.getHand() })
                    }
                  : isPickingEquip ? () => card && pickTreasureCard(card.id) : undefined
              const isHighlighted = canActivate || isJueJiThis || isPickingEquip
              const hoverText = canActivate
                ? `点击 ${name} 当杀使用`
                : isYuRen
                  ? `点击 ${name} 加入驭人弃牌`
                  : isJueJiThis
                    ? `点击弃置${name}触发绝击`
                    : isPickingEquip
                      ? `点击弃置${name}`
                      : `${name} - ${desc}`
              return (
                <span
                  key={s.slot}
                  title={hoverText}
                  onClick={handleClick}
                  style={{
                    color,
                    background: `${color}22`,
                    border: `1px solid ${color}55`,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontSize: '14px',
                    lineHeight: '1',
                    cursor: handleClick ? 'pointer' : 'help',
                    fontWeight: isHighlighted ? 'bold' : 'normal',
                    boxShadow: canActivate ? '0 0 4px rgba(229,115,115,0.6)' : isJueJiThis ? '0 0 4px rgba(255,87,34,0.6)' : isPickingEquip ? (isYuRen ? '0 0 4px rgba(255,215,0,0.6)' : '0 0 4px rgba(255,152,0,0.6)') : 'none',
                  }}
                >
                  {icon}
                </span>
              )
            })}
            </div>
          </>
        )
      })()}
      {/* 判定区标记: 画地为牢/手捧雷 */}
      {hero.judgeCards.length > 0 && game && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
          {hero.judgeCards.map(cid => {
            const p = game.getPlayerById(hero.hero.id)
            const card = p?.getJudgeCards()?.find((c: Card) => c.id === cid)
            const name = card?.name ?? '???'
            const isThunder = name === '手捧雷'
            const color = isThunder ? '#e57373' : '#ce93d8'
            const icon = isThunder ? '💣' : '🔒'
            return (
              <span key={cid} style={{
                fontSize: '10px', color,
                background: `${color}22`,
                padding: '1px 5px', borderRadius: '3px',
                border: `1px solid ${color}55`,
              }}>
                {icon} {name}
              </span>
            )
          })}
        </div>
      )}

      {currentHp <= 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#f44336', fontSize: '20px', fontWeight: 'bold',
        }}>阵亡</div>
      )}
    </div>
  )
}
