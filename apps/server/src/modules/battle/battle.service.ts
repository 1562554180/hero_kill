import { Injectable } from '@nestjs/common'
import { Game } from '@hero-legend/game-engine'
import type { HeroInstance } from '@hero-legend/shared-types'

@Injectable()
export class BattleService {
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
}
