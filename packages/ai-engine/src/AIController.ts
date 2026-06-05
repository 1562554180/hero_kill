import type { AIDifficulty } from '@hero-legend/shared-types'
import type { Player } from '@hero-legend/game-engine'
import type { AIAction, BoardInfo } from './evaluators/index.js'
import type { AIStrategy } from './strategies/index.js'
import { BalancedAI, AggressiveAI, DefensiveAI } from './strategies/index.js'

export class AIController {
  private strategy: AIStrategy

  constructor(difficulty: AIDifficulty = 'normal') {
    switch (difficulty) {
      case 'easy': this.strategy = new DefensiveAI(); break
      case 'hard': this.strategy = new AggressiveAI(); break
      default: this.strategy = new BalancedAI()
    }
  }

  decide(player: Player, board: BoardInfo): AIAction[] {
    return this.strategy.decide(player, board)
  }
}
