import type { SkillType, TreasureType, GameEventType } from './enums.js'

export interface Skill {
  id: string
  name: string
  type: SkillType
  description: string
  triggerEvent?: GameEventType   // 被动技能的触发事件
  maxUsesPerTurn?: number        // 每回合使用次数限制（undefined=无限）
}

export interface Treasure {
  id: string
  name: string
  type: TreasureType
  sourceHeroId?: string          // 来自哪个英雄的技能（通用印无来源）
  skill: Skill
  triggerRate: number            // 辅印触发率（主印固定100）
  starLevel: number              // 宝具星级
}
