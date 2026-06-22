import type { BattleHero, Card, Treasure } from '@hero-legend/shared-types'
import { isRedSuit, getTreasureSlots } from '@hero-legend/shared-types'
import { useBattleStore } from '../stores/battleStore'
import { HeroPortrait } from './HeroPortrait'

interface Props {
  hero: BattleHero
  isCurrentTurn: boolean
  isSelectable: boolean
  isSelected?: boolean
  dimmed?: boolean
  onClick?: () => void
  aoJianActive?: boolean
  canPlayKill?: boolean
  onEquipAsKill?: (cardId: string) => void
  hasHongZhuang?: boolean
}

const SLOT_SIZE = '18px'

export function HeroBattleCard({ hero, isCurrentTurn, isSelectable, isSelected, dimmed, onClick, aoJianActive, canPlayKill, onEquipAsKill, hasHongZhuang }: Props) {
  const game = useBattleStore(s => s.game)
  const phase = useBattleStore(s => s.phase)
  const treasureSkill = useBattleStore(s => s.treasureSkill)
  const pickTreasureCard = useBattleStore(s => s.pickTreasureCard)
  const { hero: config, currentHp, maxHp, role, instance } = hero
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0
  const isDanger = hpPercent <= 30

  const borderColor = isSelected
    ? '#ffd54f'
    : isSelectable
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
        border: `1.5px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '4px',
        minWidth: '90px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '3px',
        opacity: currentHp > 0 ? (dimmed ? 0.4 : 1) : 0.4,
        cursor: isSelectable ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        position: 'relative',
        boxShadow: isSelected
          ? '0 0 8px rgba(255,213,79,0.7), inset 0 0 6px rgba(255,213,79,0.3)'
          : isSelectable
            ? '0 0 7px rgba(255,68,68,0.5), inset 0 0 4px rgba(255,68,68,0.2)'
            : isCurrentTurn
              ? '0 0 6px rgba(218,165,32,0.4)'
              : 'none',
      }}
    >
      {/* 头像区: SVG 武将像 + 右上 AI 徽章 */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <HeroPortrait hero={hero} size={82} />
        {(role === 'ally' || role === 'enemy') && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            fontSize: '7px',
            color: role === 'ally' ? '#a5d6a7' : '#ef9a9a',
            background: role === 'ally' ? 'rgba(46,125,50,0.85)' : 'rgba(198,40,40,0.85)',
            padding: '0 3px',
            borderRadius: '2px',
            fontWeight: 'bold',
            border: `1px solid ${role === 'ally' ? 'rgba(46,125,50,0.9)' : 'rgba(198,40,40,0.9)'}`,
          }}>AI</span>
        )}
      </div>

      {/* HP区: 当前血量(淡金底白字) + 血量格子(深红/灰, 中间分割线) — 两端对齐 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          background: 'rgba(255,213,79,0.22)',
          color: '#fff',
          fontSize: '8px', fontWeight: 'bold',
          padding: '0 4px', borderRadius: '2px',
          border: '1px solid rgba(255,213,79,0.4)',
          minWidth: '16px', textAlign: 'center',
        }}>
          {currentHp}
        </span>
        <div style={{
          display: 'flex', flex: 1, height: '8px',
          background: '#0a0a0a', borderRadius: '1px',
          overflow: 'hidden',
          border: '1px solid #0a0a0a',
          boxShadow: '0 1px 1px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
        }}>
          {Array.from({ length: maxHp }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              background: i < currentHp ? '#8b0000' : '#3a3a3a',
              borderRight: i < maxHp - 1 ? '1px solid #0a0a0a' : 'none',
            }} />
          ))}
        </div>
      </div>

      {/* 凹槽区: 永远显示4个 (主印1/2 + 辅印1/2) — 手牌数量(灰白底) 两端对齐 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {[0, 1].map(i => (
            <TreasureSlot key={`m-${i}`} treasure={mainTreasures[i]} type="main" locked={i >= slotConfig.main} />
          ))}
          {[0, 1].map(i => (
            <TreasureSlot key={`s-${i}`} treasure={subTreasures[i]} type="sub" locked={i >= slotConfig.sub} />
          ))}
        </div>
        <span style={{
          background: 'rgba(255,255,255,0.12)',
          color: 'var(--text-light)',
          fontSize: '8px', fontWeight: 'bold',
          padding: '0 4px', borderRadius: '2px',
          border: '1px solid rgba(255,255,255,0.18)',
          minWidth: '16px', textAlign: 'center',
        }}>
          {hero.handCards.length}
        </span>
      </div>

      {/* 装备区: 武器/防具/+1马/-1马 — 固定4个15px方格 */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {slots.map(s => {
              const id = hero.equipment[s.slot]
              if (!id) {
                const placeholder = s.slot === 'weapon' ? '武' : s.slot === 'armor' ? '防' : s.slot === 'attackMount' ? '+马' : '-马'
                return (
                  <span key={s.slot} style={{
                    flex: 1, height: '15px',
                    border: '1px dashed #444',
                    borderRadius: '2px',
                    fontSize: '7px',
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
                    flex: 1, height: '15px',
                    color,
                    background: `${color}22`,
                    border: `1px solid ${color}55`,
                    borderRadius: '2px',
                    fontSize: '9px',
                    lineHeight: '1',
                    cursor: handleClick ? 'pointer' : 'help',
                    fontWeight: isHighlighted ? 'bold' : 'normal',
                    boxShadow: canActivate ? '0 0 3px rgba(229,115,115,0.6)' : isJueJiThis ? '0 0 3px rgba(255,87,34,0.6)' : isPickingEquip ? (isYuRen ? '0 0 3px rgba(255,215,0,0.6)' : '0 0 3px rgba(255,152,0,0.6)') : 'none',
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
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {hero.judgeCards.map(cid => {
            const p = game.getPlayerById(hero.hero.id)
            const card = p?.getJudgeCards()?.find((c: Card) => c.id === cid)
            const name = card?.name ?? '???'
            const isThunder = name === '手捧雷'
            const color = isThunder ? '#e57373' : '#ce93d8'
            const icon = isThunder ? '💣' : '🔒'
            return (
              <span key={cid} style={{
                fontSize: '7px', color,
                background: `${color}22`,
                padding: '0 3px', borderRadius: '2px',
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
          color: '#f44336', fontSize: '14px', fontWeight: 'bold',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
        }}>阵亡</div>
      )}
    </div>
  )
}

// 宝具凹槽子组件
function TreasureSlot({ treasure, type, locked }: { treasure: Treasure | null | undefined; type: 'main' | 'sub'; locked?: boolean }) {
  const color = type === 'main' ? '#ff8a65' : '#90caf9'
  const bgColor = type === 'main' ? 'rgba(255,138,101,0.18)' : 'rgba(144,202,249,0.18)'
  const borderColor = type === 'main' ? 'rgba(255,138,101,0.5)' : 'rgba(144,202,249,0.5)'

  // 锁定凹槽 (星级未开启)
  if (locked) {
    return (
      <div
        title="未开启凹槽 (升星解锁)"
        style={{
          width: SLOT_SIZE, height: SLOT_SIZE,
          background: 'rgba(0,0,0,0.3)',
          border: '1px dashed #333',
          borderRadius: '3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#555',
          fontSize: '11px',
          fontWeight: 'bold',
          lineHeight: 1,
          cursor: 'help',
        }}
      >✕</div>
    )
  }

  if (!treasure) {
    return (
      <div
        title="空凹槽"
        style={{
          width: SLOT_SIZE, height: SLOT_SIZE,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed #555',
          borderRadius: '3px',
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
        borderRadius: '3px',
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 'bold',
        cursor: 'help',
        textShadow: '0 0 2px rgba(0,0,0,0.6)',
      }}
    >{displayChar}</div>
  )
}
