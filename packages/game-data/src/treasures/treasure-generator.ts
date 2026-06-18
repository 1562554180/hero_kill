import type { Treasure, HeroInstance, StageReward } from '@hero-legend/shared-types'
import { treasureDefinitions, type TreasureDefinition } from './treasure-definitions.js'

export function generateTreasureDrop(
  stageReward: StageReward,
  isBossBattle: boolean,
): Treasure | null {
  let dropChance = stageReward.treasureFragmentChance
  if (isBossBattle && stageReward.bossBonus) {
    dropChance = stageReward.bossBonus.treasureChance
  }

  if (Math.random() > dropChance) return null

  const def = treasureDefinitions[Math.floor(Math.random() * treasureDefinitions.length)]
  const triggerRate = def.type === 'main' ? 1.0 : def.baseTriggerRate

  const treasure: Treasure = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: def.name,
    type: def.type,
    sourceHeroId: def.sourceHeroId ?? undefined,
    skill: {
      id: def.sourceSkillId ?? def.id,
      name: def.name,
      type: 'passive',
      description: def.description,
    },
    triggerRate,
    starLevel: def.starLevel,
    count: 1,
  }

  return treasure
}

export interface EnemySpawnConfig {
  stageOrder: number
  battleIdx: number
  totalBattles: number
  isBoss: boolean
  enemyHeroIds: string[]
}

interface DifficultyTier {
  star: number
  main: number
  sub: number
}

/**
 * 根据 (关卡序号, 战斗序号, 是否BOSS) 计算敌人难度梯度.
 * - 关卡越靠后, 敌人星级越高 (1关1-3星, 2关2-4星, 3关3-5星)
 * - BOSS 固定5星 + 满配宝具 (2主+2辅)
 * - 每关内从首战到末战, 难度递增
 */
function computeDifficulty(stageOrder: number, battleIdx: number, totalBattles: number, isBoss: boolean): DifficultyTier {
  if (isBoss) return { star: 5, main: 2, sub: 2 }
  const norm = totalBattles > 1 ? battleIdx / (totalBattles - 1) : 0
  // 难度总值: 关卡1 → [1, 3], 关卡2 → [2, 4], 关卡3 → [3, 5]
  const totalDiff = stageOrder + norm * 2
  if (totalDiff < 1.5) return { star: Math.max(1, stageOrder), main: 0, sub: 0 }
  if (totalDiff < 2.5) return { star: Math.max(2, stageOrder), main: 0, sub: 1 }
  if (totalDiff < 3.5) return { star: Math.max(2, stageOrder + 1), main: 1, sub: 1 }
  if (totalDiff < 4.5) return { star: Math.max(3, stageOrder + 1), main: 1, sub: 2 }
  return { star: Math.min(5, stageOrder + 2), main: 2, sub: 2 }
}

function pickTreasureFromPool(pool: TreasureDefinition[], starTarget: number): Treasure {
  // 优先选与目标星级接近的宝具 (差距越小越优先)
  const sorted = [...pool].sort((a, b) => Math.abs(a.starLevel - starTarget) - Math.abs(b.starLevel - starTarget))
  // 在前 3 个最接近的里随机选
  const candidates = sorted.slice(0, Math.min(3, sorted.length))
  const def = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    id: `t-enemy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: def.name,
    type: def.type,
    sourceHeroId: def.sourceHeroId ?? undefined,
    skill: {
      id: def.sourceSkillId ?? def.id,
      name: def.name,
      type: 'passive',
      description: def.description,
    },
    triggerRate: def.type === 'main' ? 1.0 : def.baseTriggerRate,
    starLevel: def.starLevel,
  }
}

/**
 * 生成敌方 HeroInstance 列表. 每个敌人根据难度梯度获得对应的星级和宝具.
 * 每次调用使用 Math.random 随机, 因此同一关可刷出不同的宝具搭配.
 */
export function generateEnemyInstances(config: EnemySpawnConfig): HeroInstance[] {
  const { battleIdx, totalBattles, isBoss, enemyHeroIds } = config
  const tier = computeDifficulty(config.stageOrder, battleIdx, totalBattles, isBoss)
  const mainPool = treasureDefinitions.filter(d => d.type === 'main')
  const subPool = treasureDefinitions.filter(d => d.type === 'sub')

  return enemyHeroIds.map(heroId => {
    // BOSS 固定 5星, 普通敌人按 tier 星级 (允许在 ±0 范围内抖动)
    const starLevel = isBoss ? 5 : (tier.star === tier.star ? tier.star : tier.star) as 1 | 2 | 3 | 4 | 5
    const safeStar = starLevel as 1 | 2 | 3 | 4 | 5

    const mainTreasures: (Treasure | null)[] = []
    for (let i = 0; i < tier.main; i++) {
      mainTreasures.push(pickTreasureFromPool(mainPool, safeStar))
    }
    const subTreasures: (Treasure | null)[] = []
    for (let i = 0; i < tier.sub; i++) {
      subTreasures.push(pickTreasureFromPool(subPool, safeStar))
    }

    return {
      heroId,
      level: 1,
      growthValue: 0,
      starLevel: safeStar,
      treasures: { main: mainTreasures, sub: subTreasures },
    } satisfies HeroInstance
  })
}

export function generateInitialTreasures(): Treasure[] {
  const treasures: Treasure[] = []
  const mainDefs = treasureDefinitions.filter(d => d.type === 'main')
  const subDefs = treasureDefinitions.filter(d => d.type === 'sub')

  // 每个宝具定义生成 1 个带 count=50 的堆叠条目
  for (const def of mainDefs) {
    treasures.push({
      id: `t-init-${def.id}`,
      name: def.name,
      type: 'main',
      sourceHeroId: def.sourceHeroId ?? undefined,
      skill: { id: def.sourceSkillId ?? def.id, name: def.name, type: 'passive', description: def.description },
      triggerRate: 1.0,
      starLevel: def.starLevel,
      count: 50,
    })
  }

  for (const def of subDefs) {
    treasures.push({
      id: `t-init-${def.id}`,
      name: def.name,
      type: 'sub',
      sourceHeroId: def.sourceHeroId ?? undefined,
      skill: { id: def.sourceSkillId ?? def.id, name: def.name, type: 'passive', description: def.description },
      triggerRate: def.baseTriggerRate,
      starLevel: def.starLevel,
      count: 50,
    })
  }

  return treasures
}
