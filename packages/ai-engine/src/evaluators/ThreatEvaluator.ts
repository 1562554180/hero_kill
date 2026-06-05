import type { Player } from '@hero-legend/game-engine'

export interface AIAction {
  type: 'playCard' | 'useSkill' | 'endPhase'
  cardId?: string
  targetId?: string
  skillId?: string
}

export interface BoardInfo {
  myHero: Player
  allies: Player[]
  enemies: Player[]
  allPlayers: Player[]
}

export class ThreatEvaluator {
  static evaluate(player: Player, _board: BoardInfo): number {
    let threat = 0
    const hpRatio = player.getCurrentHp() / player.getMaxHp()
    threat += (1 - hpRatio) * 3
    threat += player.getHandSize() * 0.5
    const equipCount = Object.values(player.hero.equipment).filter(Boolean).length
    threat += equipCount
    return threat
  }

  static findMostThreatening(enemies: Player[], board: BoardInfo): Player | null {
    if (enemies.length === 0) return null
    return enemies.reduce((max: Player, p: Player) =>
      ThreatEvaluator.evaluate(p, board) > ThreatEvaluator.evaluate(max, board) ? p : max
    , enemies[0])
  }

  static findWeakest(players: Player[]): Player | null {
    if (players.length === 0) return null
    return players.reduce((min: Player, p: Player) =>
      p.getCurrentHp() < min.getCurrentHp() ? p : min
    , players[0])
  }
}
