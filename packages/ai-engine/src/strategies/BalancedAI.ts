import type { Card } from '@hero-legend/shared-types'
import type { Player } from '@hero-legend/game-engine'
import type { AIAction, BoardInfo } from '../evaluators/index.js'
import { ThreatEvaluator, CardValueEvaluator } from '../evaluators/index.js'

export interface AIStrategy {
  decide(player: Player, board: BoardInfo): AIAction[]
}

export class BalancedAI implements AIStrategy {
  decide(player: Player, board: BoardInfo): AIAction[] {
    const actions: AIAction[] = []
    const hand = player.getHand()

    if (player.getCurrentHp() < player.getMaxHp()) {
      const med = hand.find((c: Card) => c.name === '药')
      if (med) {
        actions.push({ type: 'playCard', cardId: med.id })
        return actions
      }
    }

    const equips = hand.filter((c: Card) => c.type === 'equipment')
    for (const eq of equips) {
      actions.push({ type: 'playCard', cardId: eq.id })
    }

    const kill = hand.find((c: Card) => c.name === '杀')
    if (kill) {
      const enemies = board.enemies.filter((e: Player) => e.isAlive())
      const target = ThreatEvaluator.findWeakest(enemies)
      if (target) {
        actions.push({ type: 'playCard', cardId: kill.id, targetId: target.getId() })
      }
    }

    const schemes = CardValueEvaluator.sortByValue(hand.filter((c: Card) => c.type === 'scheme'))
    for (const sc of schemes.slice(0, 2)) {
      if (sc.name === '无中生有') {
        actions.push({ type: 'playCard', cardId: sc.id })
      } else if (sc.name === '决斗' || sc.name === '烽火狼烟' || sc.name === '万箭齐发') {
        const target = ThreatEvaluator.findMostThreatening(board.enemies, board)
        if (target) actions.push({ type: 'playCard', cardId: sc.id, targetId: target.getId() })
      }
    }

    actions.push({ type: 'endPhase' })
    return actions
  }
}

export class AggressiveAI implements AIStrategy {
  decide(player: Player, board: BoardInfo): AIAction[] {
    const actions: AIAction[] = []
    const hand = player.getHand()

    const kill = hand.find((c: Card) => c.name === '杀')
    if (kill) {
      const target = ThreatEvaluator.findWeakest(board.enemies.filter((e: Player) => e.isAlive()))
      if (target) actions.push({ type: 'playCard', cardId: kill.id, targetId: target.getId() })
    }

    const attacks = hand.filter((c: Card) => ['决斗', '烽火狼烟', '万箭齐发'].includes(c.name as string))
    for (const card of attacks) {
      const target = ThreatEvaluator.findMostThreatening(board.enemies, board)
      if (target) actions.push({ type: 'playCard', cardId: card.id, targetId: target.getId() })
    }

    actions.push({ type: 'endPhase' })
    return actions
  }
}

export class DefensiveAI implements AIStrategy {
  decide(player: Player, board: BoardInfo): AIAction[] {
    const actions: AIAction[] = []
    const hand = player.getHand()

    if (player.getCurrentHp() < player.getMaxHp()) {
      const med = hand.find((c: Card) => c.name === '药')
      if (med) actions.push({ type: 'playCard', cardId: med.id })
    }

    const equips = hand.filter((c: Card) => c.type === 'equipment')
    for (const eq of equips) actions.push({ type: 'playCard', cardId: eq.id })

    if (player.getCurrentHp() > player.getMaxHp() / 2) {
      const kill = hand.find((c: Card) => c.name === '杀')
      const target = ThreatEvaluator.findWeakest(board.enemies.filter((e: Player) => e.isAlive()))
      if (kill && target) actions.push({ type: 'playCard', cardId: kill.id, targetId: target.getId() })
    }

    actions.push({ type: 'endPhase' })
    return actions
  }
}
