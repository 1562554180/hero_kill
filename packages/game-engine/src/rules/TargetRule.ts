import type { Card } from '@hero-legend/shared-types'
import type { Player } from '../core/Player.js'
import { DistanceRule } from './DistanceRule.js'

export class TargetRule {
  static needsTarget(card: Card): boolean {
    if (card.type === 'basic') {
      return card.name === '杀' || card.name === '血杀' || card.name === '暗杀'
    }
    if (card.type === 'scheme') {
      const targeted = ['决斗', '探囊取物', '釜底抽薪', '借刀杀人', '画地为牢', '手捧雷']
      return targeted.includes(card.name as string)
    }
    return false
  }

  static isAoe(card: Card): boolean {
    if (card.type === 'scheme') {
      return ['万箭齐发', '南蛮入侵', '五谷丰登'].includes(card.name as string)
    }
    return false
  }

  static getValidTargets(card: Card, player: Player, allPlayers: Player[]): Player[] {
    if (!TargetRule.needsTarget(card)) return []
    const enemies = allPlayers.filter(p => p !== player && p.isAlive())

    if (card.name === '杀' || card.name === '血杀' || card.name === '暗杀') {
      return DistanceRule.getValidTargets(player, allPlayers)
    }

    return enemies
  }
}
