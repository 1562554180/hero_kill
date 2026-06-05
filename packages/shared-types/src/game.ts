import type { PhaseType, GameEventType, Role } from './enums.js'
import type { BattleHero } from './hero.js'
import type { Card } from './card.js'

export type GamePhase = PhaseType

export interface GameState {
  id: string
  turnNumber: number
  currentPhase: GamePhase
  currentHeroId: string
  heroes: BattleHero[]
  drawPile: Card[]
  discardPile: Card[]
  isOver: boolean
  winner: 'player' | 'enemy' | null
}

export interface GameEvent {
  type: GameEventType
  sourceHeroId?: string
  targetHeroId?: string
  data?: Record<string, unknown>
  timestamp: number
}

export interface GameAction {
  type: 'playCard' | 'useSkill' | 'endPhase' | 'discardCard' | 'selectTarget' | 'respondCard'
  heroId: string
  cardId?: string
  targetId?: string
  skillId?: string
  data?: Record<string, unknown>
}

export interface DamageInfo {
  sourceId: string
  targetId: BattleHero
  amount: number
  type: 'normal' | 'fire' | 'thunder'
  cardId?: string
  skillId?: string
}

export interface BattleResult {
  won: boolean
  turnCount: number
  rewards: {
    gold: number
    growthValue: number
    heroFragments: string[]   // heroId 列表
    treasureFragments: string[]
  }
  stars: number
}
