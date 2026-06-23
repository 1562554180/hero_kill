import type { Hero, PoolConfig, RecruitPool } from '@hero-legend/shared-types'
import { heroes } from '../heroes/hero-definitions.js'

/**
 * 三池配置 (抽卡机制核心数据)
 * - 百里: 1/2/3 星, 十连必出 3★
 * - 千里: 2/3/4 星, 每日首次十连必出 4★
 * - 万里: 3/4/5 星, 每日首次十连必出 5★
 */
export const POOL_CONFIGS: Record<RecruitPool, PoolConfig> = {
  baili: {
    pool: 'baili',
    name: '名扬百里',
    costTicket: 'bailiTicket',
    costPerDraw: 1,
    costTenPull: 9,
    starWeights: { 1: 50, 2: 30, 3: 20, 4: 0, 5: 0 },
    tenPullGuaranteedStar: 3,
    dailyResetKey: null,                 // 每次十连都保 3★
  },
  qianli: {
    pool: 'qianli',
    name: '名扬千里',
    costTicket: 'qianliTicket',
    costPerDraw: 1,
    costTenPull: 9,
    starWeights: { 1: 0, 2: 70, 3: 20, 4: 10, 5: 0 },
    tenPullGuaranteedStar: 0,           // 非首次十连无保底
    dailyResetKey: 'qianliDate',
  },
  wanli: {
    pool: 'wanli',
    name: '名扬万里',
    costTicket: 'wanliTicket',
    costPerDraw: 1,
    costTenPull: 9,
    starWeights: { 1: 0, 2: 0, 3: 87, 4: 10, 5: 3 },
    tenPullGuaranteedStar: 0,
    dailyResetKey: 'wanliDate',
  },
}

export function getPoolConfig(pool: RecruitPool): PoolConfig {
  return POOL_CONFIGS[pool]
}

/** 池子里某星级的可选英雄列表 (按 starLevel 自动入池) */
export function getHeroesForPool(pool: RecruitPool, starLevel: 1 | 2 | 3 | 4 | 5): Hero[] {
  const cfg = POOL_CONFIGS[pool]
  const minStar = poolMinStar(pool)
  if (starLevel < minStar) return []
  return heroes.filter(h => h.starLevel === starLevel)
}

function poolMinStar(pool: RecruitPool): 1 | 2 | 3 {
  if (pool === 'baili') return 1
  if (pool === 'qianli') return 2
  return 3
}

/** 加权随机: 按 starWeights 抽取一个星级 */
export function rollStar(weights: Record<1 | 2 | 3 | 4 | 5, number>): 1 | 2 | 3 | 4 | 5 {
  const total = (Object.values(weights) as number[]).reduce((s, v) => s + v, 0)
  if (total <= 0) return 1
  let r = Math.random() * total
  for (const star of [1, 2, 3, 4, 5] as const) {
    r -= weights[star]
    if (r <= 0) return star
  }
  return 5
}

/** 从池子里某星级的英雄里随机抽一个. 若该池该星级无英雄 (数据缺失) 则降级到该池最低星级的英雄 */
export function rollHero(pool: RecruitPool, starLevel: 1 | 2 | 3 | 4 | 5): Hero {
  let candidates = getHeroesForPool(pool, starLevel)
  if (candidates.length === 0) {
    // 降级: 找该池最高星级的英雄 (即 poolMinStar)
    candidates = getHeroesForPool(pool, poolMinStar(pool))
  }
  if (candidates.length === 0) {
    // 兜底: 任意一个 1 星英雄 (极端情况: 数据完全缺失)
    candidates = heroes.filter(h => h.starLevel === 1)
  }
  if (candidates.length === 0) {
    throw new Error('英雄数据为空,无法抽卡')
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}