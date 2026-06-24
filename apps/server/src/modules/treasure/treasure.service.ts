import { Injectable, BadRequestException } from '@nestjs/common'
import { SaveService } from '../save/save.service'
import type { Treasure } from '@hero-legend/shared-types'

export interface UpgradeResult {
  success: boolean
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

  async upgrade(userId: string, treasureId: string, luckyStones: number): Promise<UpgradeResult> {
    if (luckyStones < 0 || luckyStones > 6 || !Number.isInteger(luckyStones)) {
      throw new BadRequestException('幸运石数量需在 0-6 之间')
    }

    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const treasure = (save.treasures as Treasure[]).find(t => t.id === treasureId)
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

    await this.saveService.spendMaterial(userId, 'enhancementTalisman', 1)
    if (luckyStones > 0) {
      await this.saveService.spendMaterial(userId, 'luckyStone', luckyStones)
    }
    await this.saveService.spendMaterial(userId, 'gold', goldCost)

    const newLevel = success ? level + 1 : level
    const newEnhanceCount = enhanceCount + 1
    await this.saveService.updateTreasure(userId, treasureId, {
      level: newLevel,
      enhanceCount: newEnhanceCount,
    })

    const updatedSave = await this.saveService.getSave(userId)
    const updatedTreasure = (updatedSave!.treasures as Treasure[]).find(t => t.id === treasureId)!

    return {
      success,
      newLevel,
      successRate: adjustedRate,
      baseRate,
      goldCost,
      luckyStonesUsed: luckyStones,
      treasure: updatedTreasure,
    }
  }

  async transferLevel(userId: string, fromTreasureId: string, toTreasureId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const from = (save.treasures as Treasure[]).find(t => t.id === fromTreasureId)
    const to = (save.treasures as Treasure[]).find(t => t.id === toTreasureId)
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

    await this.saveService.updateTreasure(userId, fromTreasureId, { level: 0 })
    await this.saveService.updateTreasure(userId, toTreasureId, { level: fromLevel })

    const updatedSave = await this.saveService.getSave(userId)
    const updatedFrom = (updatedSave!.treasures as Treasure[]).find(t => t.id === fromTreasureId)!
    const updatedTo = (updatedSave!.treasures as Treasure[]).find(t => t.id === toTreasureId)!

    return {
      fromTreasure: updatedFrom,
      toTreasure: updatedTo,
      transferredLevel: fromLevel,
    }
  }
}
