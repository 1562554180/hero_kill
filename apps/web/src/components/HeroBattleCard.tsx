import type { BattleHero, EquipmentSlot, Card } from '@hero-legend/shared-types'

import { useBattleStore } from '../stores/battleStore'

interface Props {
  hero: BattleHero
  isCurrentTurn: boolean
  isSelectable: boolean
  onClick?: () => void
}

export function HeroBattleCard({ hero, isCurrentTurn, isSelectable, onClick }: Props) {
  const game = useBattleStore(s => s.game)
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
        opacity: currentHp > 0 ? 1 : 0.4,
        cursor: isSelectable ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
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

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>手牌: {hero.handCards.length}</span>
        {hero.equipment.weapon && <span title="武器">⚔</span>}
        {hero.equipment.armor && <span title="防具">🛡</span>}
        {hero.equipment.attackMount && <span title="进攻马">🐴</span>}
        {hero.equipment.defenseMount && <span title="防御马">🐎</span>}
      </div>
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
      {/* 装备名称标签 */}
      {(hero.equipment.weapon || hero.equipment.armor || hero.equipment.attackMount || hero.equipment.defenseMount) && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          {hero.equipment.weapon && <EquipTag heroId={hero.hero.id} slot="weapon" fallbackId={hero.equipment.weapon} />}
          {hero.equipment.armor && <EquipTag heroId={hero.hero.id} slot="armor" fallbackId={hero.equipment.armor} />}
          {hero.equipment.attackMount && <EquipTag heroId={hero.hero.id} slot="attackMount" fallbackId={hero.equipment.attackMount} />}
          {hero.equipment.defenseMount && <EquipTag heroId={hero.hero.id} slot="defenseMount" fallbackId={hero.equipment.defenseMount} />}
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

function EquipTag({ heroId, slot, fallbackId }: { heroId: string; slot: EquipmentSlot; fallbackId: string }) {
  const card = useBattleStore(s => s.equippedCards[heroId]?.[slot])
  // 回退: 用equipment map中的id直接展示（不知道名字则显示⚙）
  const label = card?.name ?? '⚙装备'
  const desc = (card as any)?.description ?? ''
  const color = slot === 'weapon' ? '#ff8a65' : slot === 'armor' ? '#90caf9' : '#a5d6a7'
  return (
    <span title={desc} style={{
      fontSize: '10px', color,
      background: `${color}22`,
      padding: '1px 5px', borderRadius: '3px',
      border: `1px solid ${color}55`,
    }}>
      {label}
    </span>
  )
}
