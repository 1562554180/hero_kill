import type { BattleHero, Card, Treasure } from '@hero-legend/shared-types'
import { isRedSuit, getTreasureSlots } from '@hero-legend/shared-types'
import { memo, useEffect, useRef, useState } from 'react'
import { useBattleStore } from '../stores/battleStore'
import { HeroPortrait } from './HeroPortrait'

/** 调试: 鼠标悬停AI手牌数时显示具体手牌内容. 关闭后回到原样(只显示数字) */
const DEBUG_SHOW_AI_HAND = true

// 卡牌图片: 扫 cards/*.webp, 文件名即卡名
const cardImgModules = import.meta.glob('../images/cards/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const CARD_IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(cardImgModules)) {
  const filename = path.replace('../images/cards/', '').replace('.webp', '')
  CARD_IMAGES[filename] = url
}

const SUIT_GLYPH: Record<string, string> = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' }
const formatHandForDebug = (cards: Card[]): string =>
  cards.map(c => `${c.name}${SUIT_GLYPH[c.suit] ?? c.suit}${c.number}`).join(', ')

interface Props {
  hero: BattleHero
  isCurrentTurn: boolean
  isSelectable: boolean
  isSelected?: boolean
  dimmed?: boolean
  onClick?: () => void
  aoJianActive?: boolean
  canPlayKill?: boolean
  onEquipAsKill?: (cardId: string, fromPos?: { x: number; y: number }) => void
  hasHongZhuang?: boolean
  isDying?: boolean
  isDead?: boolean
}

const SLOT_SIZE = '18px'

function HeroBattleCardInner({ hero, isCurrentTurn, isSelectable, isSelected, dimmed, onClick, aoJianActive, canPlayKill, onEquipAsKill, hasHongZhuang, isDying = false, isDead = false }: Props) {
  const game = useBattleStore(s => s.game)
  const phase = useBattleStore(s => s.phase)
  const treasureSkill = useBattleStore(s => s.treasureSkill)
  const pickTreasureCard = useBattleStore(s => s.pickTreasureCard)
  const yuRenCardIds = useBattleStore(s => s.yuRenCardIds)
  const { hero: config, currentHp, maxHp, role, instance } = hero
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0
  const isDanger = hpPercent <= 30

  const [flash, setFlash] = useState(false)
  const prevHpRef = useRef(currentHp)

  useEffect(() => {
    const prev = prevHpRef.current
    if (currentHp < prev) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 150)
      prevHpRef.current = currentHp
      return () => clearTimeout(t)
    }
    prevHpRef.current = currentHp
  }, [currentHp])

  // 调试: 非玩家角色的手牌数悬停显示具体手牌
  const debugHandTitle = (() => {
    if (!DEBUG_SHOW_AI_HAND || !game) return undefined
    const player = game.getPlayer()
    if (player.getId() === hero.hero.id) return undefined
    const p = game.getPlayerById(hero.hero.id)
    const cards = p?.getHand() ?? []
    if (cards.length === 0) return `${hero.hero.name}: 无手牌`
    return `${hero.hero.name} 手牌 (${cards.length}): ${formatHandForDebug(cards)}`
  })()

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
      className={[isDying && 'hero-card-pulse', flash && 'hero-card-flash'].filter(Boolean).join(' ') || undefined}
      data-hero-id={hero.hero.id}
      onClick={isSelectable ? onClick : undefined}
      style={{
        background: bgColor,
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderColor: (isDying || flash) ? '#ff3333' : borderColor,
        borderRadius: '6px',
        padding: '4px',
        width: '130px',
        height: '210px',
        maxHeight: '100%',
        flexShrink: 0,
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
      {/* 判定区动画图标 (右上角): 手捧雷(引线闪)+ 画地为牢(锁开合) */}
      {game && hero.judgeCards.length > 0 && (() => {
        const p = game.getPlayerById(hero.hero.id)
        const judgeCards = p?.getJudgeCards() ?? []
        const hasThunder = judgeCards.some(c => c.name === '手捧雷')
        const hasImprisoned = judgeCards.some(c => c.name === '画地为牢')
        if (!hasThunder && !hasImprisoned) return null
        return (
          <div style={{
            position: 'absolute', top: '2px', right: '2px',
            display: 'flex', flexDirection: 'column', gap: '3px',
            zIndex: 5, pointerEvents: 'none',
          }}>
            {hasThunder && (
              <svg viewBox="0 0 24 24" width="22" height="22">
                {/* 手雷身 (深灰椭圆) */}
                <ellipse cx="12" cy="15" rx="6" ry="6" fill="#455a64" stroke="#212121" strokeWidth="0.6" />
                <line x1="7" y1="13" x2="17" y2="13" stroke="#37474f" strokeWidth="0.3" />
                <line x1="7" y1="16" x2="17" y2="16" stroke="#37474f" strokeWidth="0.3" />
                {/* 顶盖 */}
                <rect x="10" y="7" width="4" height="2.5" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
                {/* 引线 */}
                <path d="M12 7 Q15 5 14 2" stroke="#8d6e63" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                {/* 火焰 (动画: 闪烁) */}
                <g className="fuse-flame">
                  <ellipse cx="14" cy="1.5" rx="1.5" ry="2" fill="#ff6f00" />
                  <ellipse cx="14" cy="1.5" rx="0.8" ry="1.2" fill="#ffeb3b" />
                </g>
              </svg>
            )}
            {hasImprisoned && (
              <svg viewBox="0 0 24 24" width="22" height="22">
                {/* 牢笼框 */}
                <rect x="3" y="9" width="18" height="13" fill="rgba(0,0,0,0.25)" stroke="#5d4037" strokeWidth="1" rx="1" />
                {/* 横向栅栏 */}
                <line x1="3" y1="15" x2="21" y2="15" stroke="#5d4037" strokeWidth="0.6" />
                {/* 竖向栅栏 */}
                <line x1="8" y1="9" x2="8" y2="22" stroke="#5d4037" strokeWidth="0.6" />
                <line x1="12" y1="9" x2="12" y2="22" stroke="#5d4037" strokeWidth="0.6" />
                <line x1="16" y1="9" x2="16" y2="22" stroke="#5d4037" strokeWidth="0.6" />
                {/* 锁 (动画: 开合) */}
                <g className="lock-shackle">
                  <rect x="9" y="4" width="6" height="5" rx="1" fill="#ffd54f" stroke="#5d4037" strokeWidth="0.5" />
                  <circle cx="12" cy="6.3" r="0.7" fill="#212121" />
                  <rect x="11.6" y="6.3" width="0.8" height="1.5" fill="#212121" />
                </g>
              </svg>
            )}
          </div>
        )
      })()}

      {/* 人物展示区: 占满顶部区域 (flex: 1) — SVG 武将像/PNG 立绘 + 右上 AI 徽章 */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
          <HeroPortrait hero={hero} fill />
        </div>
        {(role === 'ally' || role === 'enemy') && (
          <span style={{
            position: 'absolute', top: '2px', left: '2px',
            fontSize: '7px',
            color: role === 'ally' ? '#a5d6a7' : '#ef9a9a',
            background: role === 'ally' ? 'rgba(46,125,50,0.85)' : 'rgba(198,40,40,0.85)',
            padding: '0 3px',
            borderRadius: '2px',
            fontWeight: 'bold',
            border: `1px solid ${role === 'ally' ? 'rgba(46,125,50,0.9)' : 'rgba(198,40,40,0.9)'}`,
            zIndex: 2,
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
            <div key={i} className="hp-cell" style={{
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
            <TreasureSlot key={`m-${i}`} treasure={mainTreasures[i]} type="main" locked={i >= slotConfig.main} heroStarLevel={instance.starLevel} />
          ))}
          {[0, 1].map(i => (
            <TreasureSlot key={`s-${i}`} treasure={subTreasures[i]} type="sub" locked={i >= slotConfig.sub} heroStarLevel={instance.starLevel} />
          ))}
        </div>
        <span
          title={debugHandTitle}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'var(--text-light)',
            fontSize: '8px', fontWeight: 'bold',
            padding: '0 4px', borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.18)',
            minWidth: '16px', textAlign: 'center',
            cursor: debugHandTitle ? 'help' : 'default',
          }}>
          {hero.handCards.length}
        </span>
      </div>

      {/* 装备区: 武器/防具/+1马/-1马 — 固定4个竖向细长方格 */}
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
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '2px', height: '40px' }}>
            {slots.map(s => {
              const id = hero.equipment[s.slot]
              if (!id) {
                const placeholder = s.slot === 'weapon' ? '武' : s.slot === 'armor' ? '防' : s.slot === 'attackMount' ? '+马' : '-马'
                return (
                  <span key={s.slot} data-equip-slot={s.slot} style={{
                    flex: 1, alignSelf: 'stretch',
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
              const cardImg = card ? CARD_IMAGES[card.name] : undefined
              const isRed = !!card && isRedSuit(card.suit)
              const canActivate = aoJianActive && isRed && !!canPlayKill && !!card
              const isJueJiThis = isJueJiWeaponPick && s.slot === 'weapon' && !!card
              const isPickingEquip = isSelectingEquipment && !!card
              // 驭人模式下, 已选入弃牌堆的装备: 高亮红框+"弃"字
              const isYuRenSelected = isYuRen && !!card && yuRenCardIds.includes(card.id)
              const defaultColor = s.slot === 'weapon' ? '#ff8a65' : s.slot === 'armor' ? '#90caf9' : '#a5d6a7'
              const activeColor = isYuRen ? '#b8860b' : '#ff9800'
              const selectedColor = '#c62828'
              const color = isYuRenSelected
                ? selectedColor
                : canActivate
                  ? '#e57373'
                  : isJueJiThis
                    ? '#ff5722'
                    : isPickingEquip
                      ? activeColor
                      : defaultColor
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
                : isYuRenSelected
                  ? `已选: ${name} (再次点击取消)`
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
                  data-equip-slot={s.slot}
                  title={hoverText}
                  onClick={handleClick}
                  style={{
                    flex: 1, alignSelf: 'stretch',
                    color: isYuRenSelected || canActivate || isJueJiThis || isPickingEquip ? color : '#1b5e20',
                    background: isYuRenSelected
                      ? 'rgba(198,40,40,0.35)'
                      : canActivate
                        ? 'rgba(229,115,115,0.35)'
                        : isJueJiThis
                          ? 'rgba(255,87,34,0.35)'
                          : isPickingEquip
                            ? isYuRen ? 'rgba(184,134,11,0.35)' : 'rgba(255,152,0,0.35)'
                            : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
                    border: `1.5px solid ${isYuRenSelected ? selectedColor : canActivate ? '#e57373' : isJueJiThis ? '#ff5722' : isPickingEquip ? (isYuRen ? '#b8860b' : '#ff9800') : '#2e7d32'}`,
                    borderRadius: '3px',
                    fontSize: '9px',
                    lineHeight: '1',
                    cursor: handleClick ? 'pointer' : 'help',
                    fontWeight: isHighlighted || isYuRenSelected ? 'bold' : 'normal',
                    boxShadow: isYuRenSelected
                      ? '0 0 5px rgba(198,40,40,0.85), inset 0 0 3px rgba(198,40,40,0.4)'
                      : canActivate ? '0 0 3px rgba(229,115,115,0.6)' : isJueJiThis ? '0 0 3px rgba(255,87,34,0.6)' : isPickingEquip ? (isYuRen ? '0 0 3px rgba(255,215,0,0.6)' : '0 0 3px rgba(255,152,0,0.6)') : '0 1px 2px rgba(0,0,0,0.4), inset 0 0 4px rgba(46,125,50,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {cardImg ? (
                    <img
                      src={cardImg}
                      alt={name}
                      draggable={false}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '85%', height: '85%', objectFit: 'contain',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : icon}
                  {isYuRenSelected && (
                    <span style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(198,40,40,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '9px', fontWeight: 'bold',
                      textShadow: '0 0 2px rgba(0,0,0,0.95), 0 0 1px rgba(0,0,0,1)',
                      pointerEvents: 'none',
                    }}>弃</span>
                  )}
                </span>
              )
            })}
          </div>
        )
      })()}

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
function TreasureSlot({ treasure, type, locked, heroStarLevel }: { treasure: Treasure | null | undefined; type: 'main' | 'sub'; locked?: boolean; heroStarLevel?: number }) {
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
  const baseRate = treasure.triggerRate ?? 0
  const lvl = treasure.level ?? 0
  const starBonus = heroStarLevel === 5 ? 0.1 : 0
  const actualRate = baseRate + lvl * 0.01 + starBonus
  const tooltip = type === 'sub'
    ? `${treasure.name} (辅印)\n基础触发: ${Math.round(baseRate * 100)}%\n强化 Lv.${lvl}/45 · 强化后触发: ${Math.round(actualRate * 100)}%${starBonus > 0 ? ` (含星5 +10%)` : ''}\n${treasure.skill?.description ?? ''}`
    : `${treasure.name} (主印)\n触发: 100%\n${treasure.skill?.description ?? ''}`
  return (
    <div
      title={tooltip}
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

export const HeroBattleCard = memo(HeroBattleCardInner)

