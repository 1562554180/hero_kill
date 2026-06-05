import type { Skill } from '@hero-legend/shared-types'
import { SkillExecutor } from './SkillExecutor.js'
import type { SkillContext, SkillEffect } from './SkillExecutor.js'

// 舍身：受到伤害时摸两张牌
class SheShenSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && ctx.player.isAlive()
  }

  execute(ctx: SkillContext): SkillEffect[] {
    return [{
      type: 'drawCard',
      sourceHeroId: ctx.player.getId(),
      data: { count: 2, reason: '舍身' },
    }]
  }
}

// 奸雄：受到伤害时获得伤害来源一张手牌
class JianXiongSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && !!ctx.target
  }

  execute(ctx: SkillContext): SkillEffect[] {
    return [{
      type: 'stealCard',
      sourceHeroId: ctx.player.getId(),
      targetHeroId: ctx.target!.getId(),
      data: { count: 1, reason: '奸雄' },
    }]
  }
}

// 复仇：受到伤害后对伤害来源造成1点伤害
class FuChouSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && !!ctx.target && ctx.target.isAlive()
  }

  execute(ctx: SkillContext): SkillEffect[] {
    return [{
      type: 'damage',
      sourceHeroId: ctx.player.getId(),
      targetHeroId: ctx.target!.getId(),
      data: { amount: 1, reason: '复仇' },
    }]
  }
}

const skillRegistry: Map<string, (skill: Skill) => SkillExecutor> = new Map([
  ['she-shen', (s) => new SheShenSkill(s)],
  ['jian-xiong', (s) => new JianXiongSkill(s)],
  ['fu-chou', (s) => new FuChouSkill(s)],
])

export function createSkillExecutor(skill: Skill): SkillExecutor | null {
  const factory = skillRegistry.get(skill.id)
  return factory ? factory(skill) : null
}

export { SkillExecutor }
export type { SkillContext, SkillEffect }
