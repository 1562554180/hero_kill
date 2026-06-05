import type { Skill, GameEventType } from '@hero-legend/shared-types'
import type { Player } from '../core/Player.js'
import type { Game } from '../core/Game.js'

export interface SkillContext {
  game: Game
  player: Player
  target?: Player
  data?: Record<string, unknown>
}

export interface SkillEffect {
  type: 'drawCard' | 'damage' | 'heal' | 'discard' | 'stealCard' | 'modifyDamage' | 'preventDamage' | 'grantExtraAction'
  sourceHeroId: string
  targetHeroId?: string
  data: Record<string, unknown>
}

export abstract class SkillExecutor {
  readonly skill: Skill

  constructor(skill: Skill) {
    this.skill = skill
  }

  abstract canActivate(context: SkillContext): boolean
  abstract execute(context: SkillContext): SkillEffect[]

  protected checkUses(player: Player): boolean {
    if (!this.skill.maxUsesPerTurn) return true
    const used = player.hero.skillUsesThisTurn[this.skill.id] ?? 0
    return used < this.skill.maxUsesPerTurn
  }

  protected recordUse(player: Player): void {
    if (!this.skill.maxUsesPerTurn) return
    const used = player.hero.skillUsesThisTurn[this.skill.id] ?? 0
    player.hero.skillUsesThisTurn[this.skill.id] = used + 1
  }
}
