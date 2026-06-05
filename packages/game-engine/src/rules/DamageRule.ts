import type { Player } from '../core/Player.js'
import type { Card } from '@hero-legend/shared-types'

export interface DamageResult {
  targetId: string
  amount: number
  prevented: boolean
  died: boolean
}

export class DamageRule {
  static applyDamage(
    source: Player,
    target: Player,
    amount: number,
    card: Card | null,
    eventBus: any
  ): DamageResult {
    // 检查是否有防具减伤
    let finalDamage = amount
    if (target.hero.equipment.armor) {
      // 护心镜：每回合第一次伤害-1（简化实现）
      finalDamage = Math.max(0, finalDamage - 0) // 预留扩展
    }

    const actual = target.takeDamage(finalDamage)

    eventBus.emit({
      type: 'damage:deal',
      sourceHeroId: source.getId(),
      targetHeroId: target.getId(),
      data: { damage: actual, cardId: card?.id },
    })

    eventBus.emit({
      type: 'damage:receive',
      sourceHeroId: target.getId(),
      data: { damage: actual, from: source.getId(), cardId: card?.id },
    })

    const died = !target.isAlive()
    if (died) {
      eventBus.emit({
        type: 'die',
        sourceHeroId: target.getId(),
        data: { killedBy: source.getId() },
      })
    }

    return { targetId: target.getId(), amount: actual, prevented: false, died }
  }

  static applyHeal(target: Player, amount: number, eventBus: any): number {
    const healed = target.heal(amount)
    if (healed > 0) {
      eventBus.emit({
        type: 'heal',
        sourceHeroId: target.getId(),
        data: { amount: healed },
      })
    }
    return healed
  }
}
