import { Injectable, BadRequestException } from '@nestjs/common'
import { SaveService } from '../save/save.service'
import type { Treasure } from '@hero-legend/shared-types'

export interface UpgradeResult {
  success: boolean
  lucky: boolean
  newLevel: number
  successRate: number
  baseRate: number
  goldCost: number
  luckyStonesUsed: number
  treasure: Treasure
}

@Injectable()
export class TreasureService {
  constructor(private saveService: SaveService) {}

  private isMain(t: Treasure): boolean {
    return t.type === 'main'
  }

  /**
   * 跨位置查找宝具: 先扫背包 (save.treasures), 再扫所有英雄的装备槽 (main/sub).
   * 返回对象引用 (mongoose document 内嵌对象), 修改后调 save.save() 即可持久化.
   */
  private findTreasureAnywhere(save: any, treasureId: string): Treasure | null {
    const inBag = (save.treasures as Treasure[]).find(t => t.id === treasureId)
    if (inBag) return inBag
    for (const h of (save.heroes as any[]) ?? []) {
      const ts = h.treasures ?? { main: [], sub: [] }
      for (const slot of ['main', 'sub'] as const) {
        for (const t of (ts[slot] ?? [])) {
          if (t?.id === treasureId) return t as Treasure
        }
      }
    }
    return null
  }

  async upgrade(userId: string, treasureId: string, luckyStones: number): Promise<UpgradeResult> {
    if (luckyStones < 0 || luckyStones > 6 || !Number.isInteger(luckyStones)) {
      throw new BadRequestException('幸运石数量需在 0-6 之间')
    }

    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const treasure = this.findTreasureAnywhere(save, treasureId)
    if (!treasure) throw new BadRequestException('宝具不存在')
    if (this.isMain(treasure)) throw new BadRequestException('主印不可强化')

    const level = treasure.level ?? 0
    if (level >= 45) throw new BadRequestException('已满级 (45)')

    const enhanceCount = treasure.enhanceCount ?? 0
    if (enhanceCount >= 50) throw new BadRequestException('强化次数已用尽 (50/50)')

    const baseRate = Math.round(100 - level * 85 / 44)
    const goldCost = 100 * (level + 1)

    const talisman = (save.materials as any[]).find(m => m.type === 'enhancementTalisman')
    if (!talisman || talisman.amount < 1) throw new BadRequestException('强化符不足')

    if (luckyStones > 0) {
      const lucky = (save.materials as any[]).find(m => m.type === 'luckyStone')
      if (!lucky || lucky.amount < luckyStones) throw new BadRequestException('幸运石不足')
    }

    const gold = (save.materials as any[]).find(m => m.type === 'gold')
    if (!gold || gold.amount < goldCost) throw new BadRequestException('金币不足')

    const adjustedRate = Math.min(100, baseRate + luckyStones * 5)
    const roll = Math.random() * 100
    const success = roll < adjustedRate

    // 强化成功后, 额外 0.5% 概率触发"欧皇附体": 连升 3 级 (封顶 45)
    const lucky = success && Math.random() < 0.005
    const levelGain = lucky ? 3 : 1

    await this.saveService.spendMaterial(userId, 'enhancementTalisman', 1)
    if (luckyStones > 0) {
      await this.saveService.spendMaterial(userId, 'luckyStone', luckyStones)
    }
    await this.saveService.spendMaterial(userId, 'gold', goldCost)

    const newLevel = success ? Math.min(level + levelGain, 45) : level
    const newEnhanceCount = enhanceCount + 1
    treasure.level = newLevel
    treasure.enhanceCount = newEnhanceCount
    // treasure 可能是内嵌 sub-document (装备槽), mongoose 变更跟踪对内嵌对象可能失效
    ;(save as any).markModified?.('heroes')
    ;(save as any).markModified?.('treasures')
    await save.save()

    return {
      success,
      lucky,
      newLevel,
      successRate: adjustedRate,
      baseRate,
      goldCost,
      luckyStonesUsed: luckyStones,
      treasure,
    }
  }

  async transferLevel(userId: string, fromTreasureId: string, toTreasureId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const from = this.findTreasureAnywhere(save, fromTreasureId)
    const to = this.findTreasureAnywhere(save, toTreasureId)
    if (!from) throw new BadRequestException('源宝具不存在')
    if (!to) throw new BadRequestException('目标宝具不存在')

    if (this.isMain(from) || this.isMain(to)) {
      throw new BadRequestException('主印不可转移')
    }

    const fromLevel = from.level ?? 0
    const toLevel = to.level ?? 0
    if (fromLevel < 1) throw new BadRequestException('源无等级可转移')
    if (toLevel > 0) throw new BadRequestException('目标已有等级,无法接收')

    const transferMat = (save.materials as any[]).find(m => m.type === 'transferTalisman')
    if (!transferMat || transferMat.amount < 1) throw new BadRequestException('转移符不足')

    await this.saveService.spendMaterial(userId, 'transferTalisman', 1)

    from.level = 0
    to.level = fromLevel
    ;(save as any).markModified?.('heroes')
    ;(save as any).markModified?.('treasures')
    await save.save()

    return {
      fromTreasure: from,
      toTreasure: to,
      transferredLevel: fromLevel,
    }
  }

  /**
   * 分解宝具 → 宝具碎片
   * 1) 若有英雄装备着它, 先解除装备 (slot → null)
   * 2) 从 save.treasures 中删除该宝具
   * 3) 按星级奖励碎片: 5★=2500 / 4★=1000 / 3★=400 / 2★=100 / 1★=20
   * 4) treasureFragment 加入 save.materials
   */
  async decompose(userId: string, treasureId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const treasure = (save.treasures as Treasure[]).find(t => t.id === treasureId)
    if (!treasure) throw new BadRequestException('宝具不存在')

    // 1) 找装备该宝具的英雄, 同时就地解除
    let equippedHero: { instanceId: string; heroId: string; slot: 'main' | 'sub'; index: number } | null = null
    for (const h of (save.heroes as any[]) ?? []) {
      const ts = h.treasures ?? { main: [], sub: [] }
      let found = false
      for (let i = 0; i < (ts.main?.length ?? 0); i++) {
        if (ts.main[i]?.id === treasureId) {
          h.treasures.main[i] = null
          equippedHero = { instanceId: h.instanceId, heroId: h.heroId, slot: 'main', index: i }
          found = true
          break
        }
      }
      if (found) break
      for (let i = 0; i < (ts.sub?.length ?? 0); i++) {
        if (ts.sub[i]?.id === treasureId) {
          h.treasures.sub[i] = null
          equippedHero = { instanceId: h.instanceId, heroId: h.heroId, slot: 'sub', index: i }
          found = true
          break
        }
      }
      if (found) break
    }

    // 2) 从 treasures 数组删除
    save.treasures = (save.treasures as any[]).filter(t => t.id !== treasureId)
    if (equippedHero) {
      ;(save as any).markModified?.('heroes')
    }

    // 3) 加碎片
    const FRAGMENT_BY_STAR: Record<number, number> = { 1: 20, 2: 100, 3: 400, 4: 1000, 5: 2500 }
    const fragments = FRAGMENT_BY_STAR[treasure.starLevel] ?? 0
    const mat = (save.materials as any[]).find(m => m.type === 'treasureFragment')
    if (mat) {
      mat.amount = (mat.amount ?? 0) + fragments
    } else {
      save.materials.push({ type: 'treasureFragment', amount: fragments } as any)
    }

    // 4) 持久化
    await save.save()

    return {
      success: true,
      treasureId,
      treasureName: treasure.name,
      starLevel: treasure.starLevel,
      fragments,
      removedFrom: equippedHero,    // null = 未装备
    }
  }
}
