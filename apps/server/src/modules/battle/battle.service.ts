import { Injectable } from '@nestjs/common'
import { Game } from '@hero-legend/game-engine'
import type { HeroInstance, BattleResult, Treasure } from '@hero-legend/shared-types'
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
    playerHeroId?: string
  }) {
    const { userId, stageId, battleIdx, result, playerHeroId } = body
    const save = await this.saveService.getSave(userId)
    if (!save) return { success: false, error: '存档不存在' }

    // Add rewards
    if (result.rewards.gold > 0) {
      const gold = save.materials.find((m: any) => m.type === 'gold')
      if (gold) gold.amount += result.rewards.gold
    }

    if (result.rewards.growthValue > 0) {
      // Distribute growth to the hero that actually fought
      const hero = playerHeroId
        ? save.heroes.find((h: any) => h.heroId === playerHeroId)
        : save.heroes[0]
      if (hero) {
        hero.growthValue += result.rewards.growthValue
        hero.level = Math.min(50, Math.floor(hero.growthValue / 100) + 1)
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
        // 合并到背包堆叠: 找到同类则 count++, 否则 push
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

    await this.saveService.updateSave(userId, {
      materials: save.materials,
      heroes: save.heroes,
      stageProgress: save.stageProgress,
      treasures: save.treasures,
    })

    return { success: true, rewards: result.rewards, droppedTreasure }
  }
}
