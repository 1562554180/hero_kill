import { Injectable, BadRequestException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { SaveService } from '../save/save.service'
import {
  TREASURE_PAVILION_EXCHANGE_LIST,
  TREASURE_COMPOSE_COST,
  rollTreasurePavilionSlot,
  randomTreasureIdByStar,
  rollPieceAmount,
  getTreasureDefinitionById,
} from '@hero-legend/game-data'
import type { Treasure } from '@hero-legend/shared-types'

export type DrawResultItem =
  | { kind: 'treasure'; defId: string; treasure: Treasure; star: number }
  | { kind: 'universal'; amount: number }
  | { kind: 'piece'; defId: string; amount: number }

function buildTreasureFromDef(defId: string): Treasure {
  const def = getTreasureDefinitionById(defId)
  if (!def) throw new Error(`treasure def not found: ${defId}`)
  return {
    id: `tp-${randomUUID()}`,
    name: def.name,
    type: def.type,
    sourceHeroId: def.sourceHeroId ?? undefined,
    skill: {
      id: def.sourceSkillId ?? def.id,
      name: def.name,
      type: 'passive',
      description: def.description,
    },
    triggerRate: def.type === 'main' ? 1.0 : def.baseTriggerRate,
    starLevel: def.starLevel,
    count: 1,
    level: 0,
    enhanceCount: 0,
    effect: def.effect,
  }
}

@Injectable()
export class TreasurePavilionService {
  constructor(private saveService: SaveService) {}

  async info(userId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')
    const ticket = (save.materials as any[]).find(m => m.type === 'treasureTicket')?.amount ?? 0
    const universal = (save.materials as any[]).find(m => m.type === 'treasureFragment')?.amount ?? 0
    return {
      ticket,
      universalFragment: universal,
      treasurePiece: (save.treasurePiece as any[]) ?? [],
      exchangeList: TREASURE_PAVILION_EXCHANGE_LIST,
    }
  }

  async draw(userId: string, count: 1 | 10): Promise<{ success: true; results: DrawResultItem[]; remainingTickets: number }> {
    if (count !== 1 && count !== 10) throw new BadRequestException('count 必须为 1 或 10')
    const cost = count === 10 ? 9 : 1

    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')
    const ticket = (save.materials as any[]).find(m => m.type === 'treasureTicket')?.amount ?? 0
    if (ticket < cost) throw new BadRequestException(`宝具券不足 (需 ${cost}, 持 ${ticket})`)

    const spent = await this.saveService.spendMaterial(userId, 'treasureTicket', cost)
    if (!spent) throw new BadRequestException('宝具券不足')

    const results: DrawResultItem[] = []
    for (let i = 0; i < count; i++) {
      const isLastOfTen = count === 10 && i === count - 1
      const slot = isLastOfTen ? 'star3' : rollTreasurePavilionSlot()
      results.push(await this.resolveSlot(userId, slot))
    }

    const fresh = await this.saveService.getSave(userId)
    const remainingTickets = (fresh!.materials as any[]).find(m => m.type === 'treasureTicket')?.amount ?? 0
    return { success: true, results, remainingTickets }
  }

  private async resolveSlot(userId: string, slot: string): Promise<DrawResultItem> {
    switch (slot) {
      case 'star1': return this.awardTreasure(userId, 1)
      case 'star2': return this.awardTreasure(userId, 2)
      case 'star3': return this.awardTreasure(userId, 3)
      case 'star4': return this.awardTreasure(userId, 4)
      case 'star5': return this.awardTreasure(userId, 5)
      case 'universal': {
        const amount = rollPieceAmount()
        await this.saveService.addMaterial(userId, 'treasureFragment', amount)
        return { kind: 'universal', amount }
      }
      case 'piece3': return this.awardPiece(userId, 3)
      case 'piece4': return this.awardPiece(userId, 4)
      case 'piece5': return this.awardPiece(userId, 5)
      default: throw new Error(`unknown slot: ${slot}`)
    }
  }

  private async awardTreasure(userId: string, star: 1|2|3|4|5): Promise<DrawResultItem> {
    const defId = randomTreasureIdByStar(star)
    const treasure = buildTreasureFromDef(defId)
    await this.saveService.addTreasureInstance(userId, treasure)
    return { kind: 'treasure', defId, treasure, star }
  }

  private async awardPiece(userId: string, star: 3|4|5): Promise<DrawResultItem> {
    const defId = randomTreasureIdByStar(star)
    const amount = rollPieceAmount()
    await this.saveService.addTreasurePiece(userId, defId, amount)
    return { kind: 'piece', defId, amount }
  }

  async compose(userId: string, treasureId: string): Promise<{ success: true; treasure: Treasure }> {
    const def = getTreasureDefinitionById(treasureId)
    if (!def) throw new BadRequestException('宝具定义不存在')

    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')
    const piece = (save.treasurePiece as any[]).find(p => p.treasureId === treasureId)
    if (!piece || piece.amount < TREASURE_COMPOSE_COST) {
      throw new BadRequestException(`碎片不足 (需 ${TREASURE_COMPOSE_COST})`)
    }

    await this.saveService.spendTreasurePiece(userId, treasureId, TREASURE_COMPOSE_COST)
    const treasure = buildTreasureFromDef(treasureId)
    await this.saveService.addTreasureInstance(userId, treasure)
    return { success: true, treasure }
  }

  async exchange(userId: string, treasureId: string): Promise<{ success: true; treasure: Treasure; remainingUniversal: number }> {
    const item = TREASURE_PAVILION_EXCHANGE_LIST.find(t => t.treasureId === treasureId)
    if (!item) throw new BadRequestException('该宝具不可兑换')

    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')
    const universal = (save.materials as any[]).find(m => m.type === 'treasureFragment')?.amount ?? 0
    if (universal < item.price) throw new BadRequestException(`万能碎片不足 (需 ${item.price}, 持 ${universal})`)

    const spent = await this.saveService.spendMaterial(userId, 'treasureFragment', item.price)
    if (!spent) throw new BadRequestException('万能碎片不足')
    const treasure = buildTreasureFromDef(treasureId)
    await this.saveService.addTreasureInstance(userId, treasure)
    return { success: true, treasure, remainingUniversal: spent.newAmount }
  }
}
