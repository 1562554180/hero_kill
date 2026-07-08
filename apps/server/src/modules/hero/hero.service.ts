import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { SaveService } from '../save/save.service'
import { heroes } from '@hero-legend/game-data'
import type { HeroInstance, Treasure } from '@hero-legend/shared-types'
import { getMaxLevelByStar } from '@hero-legend/shared-types'

/** 比较两个宝具是否同一类 (按 name+type+starLevel+triggerRate), 用于合并堆叠 */
function isSameTreasureKind(a: Treasure, b: Partial<Treasure>): boolean {
  return a.name === b.name
    && a.type === b.type
    && a.starLevel === b.starLevel
    && a.triggerRate === b.triggerRate
    && (a.level ?? 0) === (b.level ?? 0)
    && (a.enhanceCount ?? 0) === (b.enhanceCount ?? 0)
}

/** 合并新宝具到背包: 找到同类则 count++, 否则 push. 返回更新后的 treasures 数组 */
function pushToInventory(treasures: Treasure[], incoming: Treasure): Treasure[] {
  const existing = treasures.find(t => isSameTreasureKind(t, incoming))
  if (existing) {
    existing.count = (existing.count ?? 1) + (incoming.count ?? 1)
    return treasures
  }
  return [...treasures, incoming]
}

@Injectable()
export class HeroService {
  constructor(private saveService: SaveService) {}

  /** 通过 instanceId 找英雄 (老存档 backfill 过 instanceId) */
  private findByInstanceId(save: any, instanceId: string): HeroInstance | undefined {
    return (save.heroes as HeroInstance[]).find(h => h.instanceId === instanceId)
  }

  async levelUp(userId: string, instanceId: string, growthAmount: number) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = this.findByInstanceId(save, instanceId)
    if (!heroInstance) return { error: '未拥有该英雄' }

    heroInstance.growthValue += growthAmount
    const cap = getMaxLevelByStar(heroInstance.starLevel)
    heroInstance.level = Math.min(cap, Math.floor(heroInstance.growthValue / 100) + 1)

    await this.saveService.updateSave(userId, { heroes: save.heroes })
    return { success: true, hero: heroInstance }
  }

  async equipTreasure(userId: string, instanceId: string, slotType: 'main' | 'sub', slotIndex: number, treasureId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = this.findByInstanceId(save, instanceId)
    if (!heroInstance) return { error: '未拥有该英雄' }

    const slots = heroInstance.treasures[slotType]
    if (slotIndex < 0 || slotIndex >= slots.length) return { error: '槽位不存在' }

    const stackIdx = save.treasures.findIndex((t: any) => t.id === treasureId)
    if (stackIdx < 0) return { error: '宝具不存在' }
    const stack: Treasure = save.treasures[stackIdx]

    // 校验: 该 skill.id 不能与英雄自身技能或已装备槽位重复
    const newSkillId = stack.skill?.id
    if (newSkillId) {
      // 1) 英雄自身技能 (例: 杨延昭有"天狼"技能, 不能再装天狼主印)
      const heroDef = heroes.find(h => h.id === heroInstance.heroId)
      const heroSkillIds = (heroDef?.skills ?? []).map(s => s.id)
      if (heroSkillIds.includes(newSkillId)) {
        return { error: '与英雄自身技能重复, 不能镶嵌' }
      }
      // 2) 已装备槽位 (排除即将被替换的当前槽)
      const mainSlots = heroInstance.treasures.main
      const subSlots = heroInstance.treasures.sub
      const conflictInMain = mainSlots.some((t, i) =>
        i !== (slotType === 'main' ? slotIndex : -1) && t?.skill?.id === newSkillId)
      const conflictInSub = subSlots.some((t, i) =>
        i !== (slotType === 'sub' ? slotIndex : -1) && t?.skill?.id === newSkillId)
      if (conflictInMain || conflictInSub) {
        return { error: '已有相同技能的宝具, 不能重复镶嵌' }
      }
    }

    // 卸下旧宝具 (合并到背包堆叠)
    if (slots[slotIndex]) {
      save.treasures = pushToInventory(save.treasures, slots[slotIndex] as Treasure)
    }

    // 从堆叠中扣 1 件, 给装备槽里的副本分配新 uuid (避免与背包堆叠 id 重复)
    const { count, ...equippedBase } = stack
    slots[slotIndex] = { ...equippedBase, id: randomUUID(), count: undefined } as Treasure
    if ((count ?? 1) > 1) {
      save.treasures[stackIdx] = { ...stack, count: (count ?? 1) - 1 }
    } else {
      save.treasures.splice(stackIdx, 1)
    }

    await this.saveService.updateSave(userId, { heroes: save.heroes, treasures: save.treasures })
    return { success: true }
  }

  async unequipTreasure(userId: string, instanceId: string, slotType: 'main' | 'sub', slotIndex: number) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = this.findByInstanceId(save, instanceId)
    if (!heroInstance) return { error: '未拥有该英雄' }

    const slots = heroInstance.treasures[slotType]
    if (slotIndex < 0 || slotIndex >= slots.length) return { error: '槽位不存在' }

    const treasure = slots[slotIndex] as Treasure | null
    if (!treasure) return { error: '该槽位没有宝具' }

    slots[slotIndex] = null
    save.treasures = pushToInventory(save.treasures, { ...treasure, count: 1 })

    await this.saveService.updateSave(userId, { heroes: save.heroes, treasures: save.treasures })
    return { success: true }
  }

  /** 使用一颗英雄石, 生成 HeroInstance */
  async useHeroStone(userId: string, stoneId: string) {
    return this.saveService.useHeroStone(userId, stoneId)
  }
}