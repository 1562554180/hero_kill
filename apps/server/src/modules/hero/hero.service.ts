import { Injectable, BadRequestException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { SaveService } from '../save/save.service'
import { heroes } from '@hero-legend/game-data'
import type { HeroInstance, Treasure } from '@hero-legend/shared-types'
import { getMaxLevelByStar } from '@hero-legend/shared-types'

/** 宝具族 id — 去掉 id 末尾的 _N 或 -N 星级后缀, 用于"同族不可重复镶嵌"判定.
 *  e.g. treasure-qiang-hua-3 → treasure-qiang-hua, main_shengqiang_5 → main_shengqiang */
function getTreasureFamilyId(t: Treasure | Partial<Treasure> | null | undefined): string | null {
  if (!t || typeof t.id !== 'string') return null
  return t.id.replace(/[-_]\d+$/, '')
}

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

    // 校验: 不能与英雄自身技能 / 已装备槽位的同族宝具重复
    //   - 英雄技能用 skill.id 精确匹配 (杨延昭不能装天狼主印)
    //   - 同族宝具用 family id: 同族不同星 (如 强化·壹 / 强化·叁) 视为同一族, 不可重复镶嵌
    const newSkillId = stack.skill?.id
    const newFamilyId = getTreasureFamilyId(stack)
    if (newSkillId) {
      // 1) 英雄自身技能 (例: 杨延昭有"天狼"技能, 不能再装天狼主印)
      const heroDef = heroes.find(h => h.id === heroInstance.heroId)
      const heroSkillIds = (heroDef?.skills ?? []).map(s => s.id)
      if (heroSkillIds.includes(newSkillId)) {
        return { error: '与英雄自身技能重复, 不能镶嵌' }
      }
    }
    if (newFamilyId) {
      // 2) 已装备槽位 (排除即将被替换的当前槽)
      const mainSlots = heroInstance.treasures.main
      const subSlots = heroInstance.treasures.sub
      const conflictInMain = mainSlots.some((t, i) =>
        i !== (slotType === 'main' ? slotIndex : -1) && getTreasureFamilyId(t) === newFamilyId)
      const conflictInSub = subSlots.some((t, i) =>
        i !== (slotType === 'sub' ? slotIndex : -1) && getTreasureFamilyId(t) === newFamilyId)
      if (conflictInMain || conflictInSub) {
        return { error: '已镶嵌同族宝具, 不能重复镶嵌' }
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

  /**
   * 放逐英雄: 删除 HeroInstance 并把装备副本（含强化等级）全部推回背包.
   * 单文档原子写 (getSave + save.save). 找不到 instanceId 抛 BadRequestException.
   */
  async banish(userId: string, instanceId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const idx = (save.heroes as HeroInstance[]).findIndex(h => h.instanceId === instanceId)
    if (idx === -1) throw new BadRequestException('INVALID_HERO')
    const victim = save.heroes[idx]

    // 收集非空装备副本
    const returned: Treasure[] = []
    for (const t of (victim.treasures?.main ?? [])) {
      if (t) returned.push(t)
    }
    for (const t of (victim.treasures?.sub ?? [])) {
      if (t) returned.push(t)
    }

    // 从 heroes 数组移除该实例
    save.heroes.splice(idx, 1)
    // 装备副本推回背包 (在末尾追加, 保留独立副本语义)
    if (returned.length > 0) {
      save.treasures.push(...returned)
    }

    await save.save()

    const heroDef = heroes.find(h => h.id === victim.heroId)
    return {
      success: true,
      removedInstanceId: instanceId,
      heroId: victim.heroId,
      heroName: heroDef?.name ?? victim.heroId,
      returnedTreasures: returned.length,
    }
  }
}