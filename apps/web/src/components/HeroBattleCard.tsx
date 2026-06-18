import type { BattleHero, Card, Treasure } from '@hero-legend/shared-types'
import { isRedSuit, getTreasureSlots } from '@hero-legend/shared-types'
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

const SLOT_SIZE = '28px'

export function HeroBattleCard({ hero, isCurrentTurn, isSelectable, dimmed, onClick, aoJianActive, canPlayKill, onEquipAsKill, hasHongZhuang }: Props) {
  const game = useBattleStore(s => s.game)
  const phase = useBattleStore(s => s.phase)
  const treasureSkill = useBattleStore(s => s.treasureSkill)
  const pickTreasureCard = useBattleStore(s => s.pickTreasureCard)
  const { hero: config, currentHp, maxHp, role, instance } = hero
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0
  const isDanger = hpPercent <= 30

  const borderColor = isSelectable
    ? '#ff4444'
    : isCurrentTurn
      ? 'var(--border-gold)'
      : role === 'enemy' ? '#c62828' : role === 'ally' ? '#2e7d32' : '#3a5a3a'
  const bgColor = role === 'enemy'
    ? 'rgba(198,40,40,0.08)'
    : role === 'ally'
      ? 'rgba(46,125,50,0.08)'
      : 'var(--bg-medium)'

  const mainTreasures = instance.treasures?.main ?? []
  const subTreasures = instance.treasures?.sub ?? []
  const slotConfig = getTreasureSlots(instance.starLevel ?? 1)

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '8px 10px',
        minWidth: '170px',
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
      {/* 头部: 角色名 + AI徽章 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-light)', fontWeight: 'bold', fontSize: '14px' }}>
          {config.name}
        </span>
        {(role === 'ally' || role === 'enemy') && (
          <span style={{
            fontSize: '9px',
            color: role === 'ally' ? '#a5d6a7' : '#ef9a9a',
            background: role === 'ally' ? 'rgba(46,125,50,0.18)' : 'rgba(198,40,40,0.18)',
            padding: '1px 5px',
            borderRadius: '3px',
            fontWeight: 'bold',
            border: `1px solid ${role === 'ally' ? 'rgba(46,125,50,0.5)' : 'rgba(198,40,40,0.5)'}`,
          }}>AI</span>
        )}
      </div>

      {/* HP区: 红心 + 数字 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {Array.from({ length: maxHp }).map((_, i) => (
            <span key={i} style={{
              color: i < currentHp ? (isDanger ? '#e57373' : '#e53935') : '#3a2a2a',
              fontSize: '14px',
              lineHeight: 1,
              textShadow: i < currentHp ? '0 0 4px rgba(229,57,53,0.6)' : 'none',
              opacity: i < currentHp ? 1 : 0.5,
            }}>♥</span>
          ))}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap', marginLeft: '2px' }}>
          {currentHp}/{maxHp}
        </span>
      </div>

      {/* 凹槽区: 主印1/N + 辅印1/M + 手牌数量 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {Array.from({ length: slotConfig.main }).map((_, i) => (
          <TreasureSlot key={`m-${i}`} treasure={mainTreasures[i]} type="main" />
        ))}
        {Array.from({ length: slotConfig.sub }).map((_, i) => (
          <TreasureSlot key={`s-${i}`} treasure={subTreasures[i]} type="sub" />
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '4px' }}>
          手牌: {hero.handCards.length}
        </span>
      </div>

      {/* 装备区: 武器/防具/+1马/-1马 — 固定4个22px方格 */}
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
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {slots.map(s => {
              const id = hero.equipment[s.slot]
              if (!id) {
                const placeholder = s.slot === 'weapon' ? '武' : s.slot === 'armor' ? '防' : s.slot === 'attackMount' ? '+马' : '-马'
                return (
                  <span key={s.slot} style={{
                    width: '32px', height: '22px',
                    border: '1px dashed #444',
                    borderRadius: '3px',
                    fontSize: '10px',
                    color: '#555',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{placeholder}</span>
                )
              }
              const card = p?.getEquippedCard(s.slot)
              const name = card?.name ?? '???'
              const desc = (card as any)?.description ?? ''
              const icon = (card as any)?.icon ?? '⚙'
              const isRed = !!card && isRedSuit(card.suit)
              const canActivate = s.slot === 'weapon' && aoJianActive && isRed && !!canPlayKill && !!card
              const isJueJiThis = isJueJiWeaponPick && s.slot === 'weapon' && !!card
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
                    width: '32px', height: '22px',
                    color,
                    background: `${color}22`,
                    border: `1px solid ${color}55`,
                    borderRadius: '3px',
                    fontSize: '13px',
                    lineHeight: '1',
                    cursor: handleClick ? 'pointer' : 'help',
                    fontWeight: isHighlighted ? 'bold' : 'normal',
                    boxShadow: canActivate ? '0 0 4px rgba(229,115,115,0.6)' : isJueJiThis ? '0 0 4px rgba(255,87,34,0.6)' : isPickingEquip ? (isYuRen ? '0 0 4px rgba(255,215,0,0.6)' : '0 0 4px rgba(255,152,0,0.6)') : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {icon}
                </span>
              )
            })}
          </div>
        )
      })()}

      {/* 判定区标记: 画地为牢/手捧雷 */}
      {hero.judgeCards.length > 0 && game && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
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
          textShadow: '0 0 6px rgba(0,0,0,0.8)',
        }}>阵亡</div>
      )}
    </div>
  )
}

// 宝具凹槽子组件
function TreasureSlot({ treasure, type }: { treasure: Treasure | null | undefined; type: 'main' | 'sub' }) {
  const color = type === 'main' ? '#ff8a65' : '#90caf9'
  const bgColor = type === 'main' ? 'rgba(255,138,101,0.18)' : 'rgba(144,202,249,0.18)'
  const borderColor = type === 'main' ? 'rgba(255,138,101,0.5)' : 'rgba(144,202,249,0.5)'

  if (!treasure) {
    return (
      <div
        title="空凹槽"
        style={{
          width: SLOT_SIZE, height: SLOT_SIZE,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed #555',
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      />
    )
  }

  const displayChar = (treasure.name?.[0] ?? '?')
  return (
    <div
      title={`${treasure.name} (${type === 'main' ? '主印' : '辅印'}) - 触发率 ${Math.round((treasure.triggerRate ?? 0) * 100)}% - ${treasure.skill?.description ?? ''}`}
      style={{
        width: SLOT_SIZE, height: SLOT_SIZE,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'help',
        textShadow: '0 0 3px rgba(0,0,0,0.6)',
      }}
    >{displayChar}</div>
  )
}
