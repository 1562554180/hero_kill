import { treasureDefinitions } from './treasure-definitions.js'

/** 兑换商城列表: 用万能碎片 (treasureFragment) 兑换指定宝具 */
export const TREASURE_PAVILION_EXCHANGE_LIST = [
  { treasureId: 'treasure-feng-huo',       star: 4 as const, price: 4000 },
  { treasureId: 'treasure-zui-jiu',        star: 4 as const, price: 4000 },
  { treasureId: 'treasure-kong-ju',        star: 5 as const, price: 5000 },
  { treasureId: 'treasure-fa-jia',         star: 5 as const, price: 5000 },
  { treasureId: 'treasure-guo-se',         star: 5 as const, price: 5000 },
  { treasureId: 'treasure-qiang-hua-5',    star: 5 as const, price: 5000 },
  { treasureId: 'treasure-jing-zhun-5',    star: 5 as const, price: 5000 },
  { treasureId: 'treasure-sha-zhi-tan-5',  star: 5 as const, price: 5000 },
] as const

/** 指定宝具碎片合成所需数量 */
export const TREASURE_COMPOSE_COST = 100

/** 抽卡权重表 (和 = 100) */
export const TREASURE_PAVILION_RATES = {
  treasureStar1: 25.8,
  treasureStar2: 4.2,
  treasureStar3: 1.4,
  treasureStar4: 1.8,
  treasureStar5: 0.5,
  universalFragment: 30.0,
  pieceStar3: 16.8,
  pieceStar4: 12.5,
  pieceStar5: 7.0,
} as const

export type PavilionSlotType =
  | 'star1' | 'star2' | 'star3' | 'star4' | 'star5'
  | 'universal' | 'piece3' | 'piece4' | 'piece5'

/** 按权重随机选一个产出档 (用于普通抽卡, 非保底) */
export function rollTreasurePavilionSlot(): PavilionSlotType {
  const entries: Array<[PavilionSlotType, number]> = [
    ['star1', TREASURE_PAVILION_RATES.treasureStar1],
    ['star2', TREASURE_PAVILION_RATES.treasureStar2],
    ['star3', TREASURE_PAVILION_RATES.treasureStar3],
    ['star4', TREASURE_PAVILION_RATES.treasureStar4],
    ['star5', TREASURE_PAVILION_RATES.treasureStar5],
    ['universal', TREASURE_PAVILION_RATES.universalFragment],
    ['piece3', TREASURE_PAVILION_RATES.pieceStar3],
    ['piece4', TREASURE_PAVILION_RATES.pieceStar4],
    ['piece5', TREASURE_PAVILION_RATES.pieceStar5],
  ]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [type, w] of entries) {
    r -= w
    if (r <= 0) return type
  }
  return entries[0][0]
}

/** 按星级缓存宝具 id 列表 */
const treasureIdsByStar: Map<number, string[]> = (() => {
  const m = new Map<number, string[]>()
  for (const def of treasureDefinitions) {
    const list = m.get(def.starLevel) ?? []
    list.push(def.id)
    m.set(def.starLevel, list)
  }
  return m
})()

/** 从指定星级里随机选一个宝具 id (用于抽到宝具或指定碎片时选具体目标) */
export function randomTreasureIdByStar(star: 1 | 2 | 3 | 4 | 5): string {
  const list = treasureIdsByStar.get(star) ?? []
  if (list.length === 0) throw new Error(`no treasure definitions for star ${star}`)
  return list[Math.floor(Math.random() * list.length)]
}

/** 随机 1-3 个碎片数量 */
export function rollPieceAmount(): number {
  return 1 + Math.floor(Math.random() * 3)
}
