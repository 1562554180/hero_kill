import { Injectable } from '@nestjs/common'
import { Game } from '@hero-legend/game-engine'
import type { HeroInstance, BattleResult, Treasure } from '@hero-legend/shared-types'
import { getMaxLevelByStar } from '@hero-legend/shared-types'
import { SaveService } from '../save/save.service'
import { stages, generateTreasureDrop } from '@hero-legend/game-data'

@Injectable()
export class BattleService {
  constructor(private saveService: SaveService) {}

  async startBattle(config: {
    playerHeroId: string
    playerInstance: HeroInstance
    allyHeroIds: string[]
    enemyHeroIds: string[]
  }) {
    const game = new Game(config)
    const result = await game.start()
    return result
  }

  async saveResult(body: {
    userId: string
    stageId: string
    battleIdx: number
    result: BattleResult
    playerInstanceId?: string   // 改为 instanceId, 同名多份时才能正确定位
  }) {
    const { userId, stageId, battleIdx, result, playerInstanceId } = body
    const save = await this.saveService.getSave(userId)
    if (!save) return { success: false, error: '存档不存在' }

    // Add rewards
    if (result.rewards.gold > 0) {
      const gold = save.materials.find((m: any) => m.type === 'gold')
      if (gold) gold.amount += result.rewards.gold
    }

    if (result.rewards.growthValue > 0) {
      // 定位出战的 HeroInstance
      const hero = playerInstanceId
        ? save.heroes.find((h: any) => h.instanceId === playerInstanceId)
        : save.heroes[0]
      if (hero) {
        hero.growthValue += result.rewards.growthValue
        const cap = getMaxLevelByStar(hero.starLevel as 1 | 2 | 3 | 4 | 5)
        hero.level = Math.min(cap, Math.floor(hero.growthValue / 100) + 1)
      }
    }

    // Update stage progress
    const stageProgress = save.stageProgress.find((sp: any) => sp.stageId === stageId)
    const stage = stages.find(s => s.id === stageId)
    if (stageProgress && result.won) {
      if (battleIdx + 1 > stageProgress.battlesCompleted) {
        stageProgress.battlesCompleted = battleIdx + 1
      }
      if (result.stars > stageProgress.stars) {
        stageProgress.stars = result.stars
      }

      // Unlock next stage if all battles complete
      if (stage && stageProgress.battlesCompleted >= stage.battles.length) {
        const nextStage = stages.find(s => s.order === stage.order + 1)
        if (nextStage) {
          const nextProgress = save.stageProgress.find((sp: any) => sp.stageId === nextStage.id)
          if (nextProgress) nextProgress.unlocked = true
        }
      }
    }

    // Generate treasure drop
    let droppedTreasure: Treasure | null = null
    if (result.won && stage) {
      const isBoss = stage.battles[battleIdx]?.isBoss ?? false
      droppedTreasure = generateTreasureDrop(stage.rewards, isBoss)
      if (droppedTreasure) {
        const existing = save.treasures.find((t: any) =>
          t.name === droppedTreasure!.name
          && t.type === droppedTreasure!.type
          && t.starLevel === droppedTreasure!.starLevel
          && t.triggerRate === droppedTreasure!.triggerRate,
        )
        if (existing) {
          existing.count = (existing.count ?? 1) + (droppedTreasure.count ?? 1)
        } else {
          save.treasures.push(droppedTreasure)
        }
      }
    }

    // 关卡胜利后发奖: 抽卡券 + 强化符 + 幸运石 + 转移符
    const allDrops: Array<{ type: string; amount: number }> = []
    if (result.won && stage) {
      const isBoss = stage.battles[battleIdx]?.isBoss ?? false
      if (isBoss) {
        allDrops.push({ type: 'qianliTicket', amount: 1 })
        if (Math.random() < 0.05) allDrops.push({ type: 'wanliTicket', amount: 1 })
        allDrops.push({ type: 'enhancementTalisman', amount: 2 })
        if (Math.random() < 0.33) allDrops.push({ type: 'luckyStone', amount: 1 })
        if (Math.random() < 0.33) allDrops.push({ type: 'transferTalisman', amount: 1 })
      } else {
        if (Math.random() < 0.20) allDrops.push({ type: 'bailiTicket', amount: 1 })
        if (Math.random() < 0.30) allDrops.push({ type: 'enhancementTalisman', amount: 1 })
        if (Math.random() < 0.10) allDrops.push({ type: 'luckyStone', amount: 1 })
        if (Math.random() < 0.10) allDrops.push({ type: 'transferTalisman', amount: 1 })
      }
      // 珍宝阁门票 (按 stage reward 概率掉落)
      const ticketChance = isBoss
        ? (stage.rewards.bossBonus?.treasureTicketChance ?? 0)
        : (stage.rewards.treasureTicketChance ?? 0)
      if (Math.random() < ticketChance) allDrops.push({ type: 'treasureTicket', amount: 1 })
      for (const drop of allDrops) {
        const mat = save.materials.find((m: any) => m.type === drop.type)
        if (mat) mat.amount += drop.amount
        else save.materials.push({ type: drop.type, amount: drop.amount })
      }
    }

    await this.saveService.updateSave(userId, {
      materials: save.materials,
      heroes: save.heroes,
      stageProgress: save.stageProgress,
      treasures: save.treasures,
    })

    return { success: true, rewards: result.rewards, droppedTreasure, drops: allDrops }
  }
}