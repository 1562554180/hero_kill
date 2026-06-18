import { Injectable } from '@nestjs/common'
import { SaveService } from '../save/save.service'
import { heroes } from '@hero-legend/game-data'
import { getTreasureSlots, type Treasure } from '@hero-legend/shared-types'

/** 比较两个宝具是否同一类 (按 name+type+starLevel+triggerRate), 用于合并堆叠 */
function isSameTreasureKind(a: Treasure, b: Partial<Treasure>): boolean {
  return a.name === b.name
    && a.type === b.type
    && a.starLevel === b.starLevel
    && a.triggerRate === b.triggerRate
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

  async recruitHero(userId: string, heroId: string) {
    const hero = heroes.find(h => h.id === heroId)
    if (!hero) return { error: '英雄不存在' }

    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const exists = save.heroes.find((h: any) => h.heroId === heroId)
    if (exists) return { error: '已拥有该英雄' }

    const slots = getTreasureSlots(hero.starLevel)
    const instance = {
      heroId: hero.id,
      level: 1,
      growthValue: 0,
      starLevel: hero.starLevel,
      treasures: {
        main: new Array(slots.main).fill(null),
        sub: new Array(slots.sub).fill(null),
      },
    }

    await this.saveService.addHero(userId, instance)
    return { success: true, hero: instance }
  }

  async levelUp(userId: string, heroId: string, growthAmount: number) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = save.heroes.find((h: any) => h.heroId === heroId)
    if (!heroInstance) return { error: '未拥有该英雄' }

    heroInstance.growthValue += growthAmount
    heroInstance.level = Math.min(50, Math.floor(heroInstance.growthValue / 100) + 1)

    await this.saveService.updateSave(userId, { heroes: save.heroes })
    return { success: true, hero: heroInstance }
  }

  async upgradeStar(userId: string, heroId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = save.heroes.find((h: any) => h.heroId === heroId)
    if (!heroInstance) return { error: '未拥有该英雄' }
    if (heroInstance.starLevel >= 5) return { error: '已达最高星级' }

    heroInstance.starLevel += 1
    const slots = getTreasureSlots(heroInstance.starLevel)
    // 扩展宝具槽
    while (heroInstance.treasures.main.length < slots.main) heroInstance.treasures.main.push(null)
    while (heroInstance.treasures.sub.length < slots.sub) heroInstance.treasures.sub.push(null)

    await this.saveService.updateSave(userId, { heroes: save.heroes })
    return { success: true, hero: heroInstance }
  }

  async equipTreasure(userId: string, heroId: string, slotType: 'main' | 'sub', slotIndex: number, treasureId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = save.heroes.find((h: any) => h.heroId === heroId)
    if (!heroInstance) return { error: '未拥有该英雄' }

    const slots = heroInstance.treasures[slotType]
    if (slotIndex < 0 || slotIndex >= slots.length) return { error: '槽位不存在' }

    const stackIdx = save.treasures.findIndex((t: any) => t.id === treasureId)
    if (stackIdx < 0) return { error: '宝具不存在' }
    const stack: Treasure = save.treasures[stackIdx]

    // 卸下旧宝具 (合并到背包堆叠)
    if (slots[slotIndex]) {
      save.treasures = pushToInventory(save.treasures, slots[slotIndex] as Treasure)
    }

    // 从堆叠中扣 1 件 (count 减 1, 装备槽中只放 1 件无 count 的副本)
    const { count, id: _id, ...equippedTreasure } = stack
    slots[slotIndex] = { ...equippedTreasure, count: undefined } as Treasure
    if ((count ?? 1) > 1) {
      save.treasures[stackIdx] = { ...stack, count: (count ?? 1) - 1 }
    } else {
      save.treasures.splice(stackIdx, 1)
    }

    await this.saveService.updateSave(userId, { heroes: save.heroes, treasures: save.treasures })
    return { success: true }
  }

  async unequipTreasure(userId: string, heroId: string, slotType: 'main' | 'sub', slotIndex: number) {
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const heroInstance = save.heroes.find((h: any) => h.heroId === heroId)
    if (!heroInstance) return { error: '未拥有该英雄' }

    const slots = heroInstance.treasures[slotType]
    if (slotIndex < 0 || slotIndex >= slots.length) return { error: '槽位不存在' }

    const treasure = slots[slotIndex] as Treasure | null
    if (!treasure) return { error: '该槽位没有宝具' }

    // Move treasure back to inventory (merge into existing stack)
    slots[slotIndex] = null
    save.treasures = pushToInventory(save.treasures, { ...treasure, count: 1 })

    await this.saveService.updateSave(userId, { heroes: save.heroes, treasures: save.treasures })
    return { success: true }
  }

  async smeltHeroes(userId: string, heroIds: string[]) {
    if (heroIds.length !== 3) return { error: '需要3个英雄石' }

    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }

    const targetInstances = save.heroes.filter((h: any) => heroIds.includes(h.heroId))
    if (targetInstances.length !== 3) return { error: '英雄石不足' }

    // 检查是否同星级
    const starLevel = targetInstances[0].starLevel
    if (!targetInstances.every((h: any) => h.starLevel === starLevel)) {
      return { error: '需要3个相同星级的英雄石' }
    }
    if (starLevel >= 5) return { error: '已达最高星级' }

    // 随机成功
    const success = Math.random() < 0.6
    if (success) {
      const resultHero = { ...targetInstances[0], starLevel: starLevel + 1, growthValue: 0, level: 1 }
      const slots = getTreasureSlots(resultHero.starLevel)
      resultHero.treasures = {
        main: new Array(slots.main).fill(null),
        sub: new Array(slots.sub).fill(null),
      }

      // 移除旧英雄，添加新英雄
      save.heroes = save.heroes.filter((h: any) => !heroIds.includes(h.heroId))
      save.heroes.push(resultHero)

      await this.saveService.updateSave(userId, { heroes: save.heroes })
      return { success: true, result: resultHero }
    }

    return { success: false, message: '熔炼失败，材料已消耗' }
  }
}
