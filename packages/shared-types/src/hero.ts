import type { Faction, Role } from './enums.js'
import type { Skill } from './skill.js'
import type { Treasure } from './skill.js'

export interface Hero {
  id: string
  name: string
  faction: Faction
  starLevel: 1 | 2 | 3 | 4 | 5
  baseHp: number
  skills: Skill[]
  description: string
}

export interface HeroInstance {
  /** uuid, 唯一标识一份英雄实例(同名多份必须不同). 老存档/旧测试可能缺失, 服务端 save.service.ts getSave 时 backfill. */
  instanceId?: string
  heroId: string
  level: number
  growthValue: number
  starLevel: 1 | 2 | 3 | 4 | 5
  treasures: {
    main: (Treasure | null)[]
    sub: (Treasure | null)[]
  }
}

export interface BattleHero {
  instance: HeroInstance
  hero: Hero              // 静态配置引用
  role: Role              // 玩家/友军/敌方
  currentHp: number
  maxHp: number
  handCards: string[]     // 手牌 cardId 列表
  equipment: {
    weapon: string | null
    attackMount: string | null
    defenseMount: string | null
    armor: string | null
  }
  judgeCards: string[]    // 判定区的延时锦囊
  statusEffects: StatusEffect[]
  skillUsesThisTurn: Record<string, number>
}

export interface StatusEffect {
  id: string
  name: string
  sourceHeroId: string
  duration: number        // 回合数，-1=永久
}

// 根据星级计算实际血量
export function getHpByStar(baseHp: number, starLevel: number): number {
  return baseHp + (starLevel - 1)
}

// 根据星级获取宝具槽配置
export function getTreasureSlots(starLevel: number): { main: number; sub: number } {
  const config: Record<number, { main: number; sub: number }> = {
    1: { main: 1, sub: 0 },
    2: { main: 1, sub: 1 },
    3: { main: 2, sub: 1 },
    4: { main: 2, sub: 2 },
    5: { main: 2, sub: 2 },
  }
  return config[starLevel] ?? { main: 0, sub: 0 }
}

// 5星英雄辅印额外触发率
export function getSubTriggerBonus(starLevel: number): number {
  return starLevel === 5 ? 0.1 : 0
}

// 根据星级返回等级上限: 1★20 / 2★30 / 3★40 / 4★50 / 5★50
export function getMaxLevelByStar(starLevel: 1 | 2 | 3 | 4 | 5): number {
  const caps: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 20, 2: 30, 3: 40, 4: 50, 5: 50,
  }
  return caps[starLevel] ?? 50
}
