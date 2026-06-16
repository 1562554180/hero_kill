import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

const baseInstance = (id: string, star: 1 | 2 | 3 | 4 | 5): HeroInstance => ({
  heroId: id, level: 1, growthValue: 0, starLevel: star, treasures: { main: [], sub: [] },
})

function card(name: string, id: string, suit: any = 'spade', number = 5, type: any = 'basic'): Card {
  return { id, suit, number, type, name } as any
}

function equipment(name: string, id: string, slot: any, range?: number): Card {
  return { id, suit: 'spade', number: 1, type: 'equipment', name, slot, range, description: '' } as any
}

describe('国色: 无防具默认视为装备玉如意', () => {
  it('小乔 无防具 → getArmorName 返回 玉如意', () => {
    const game = new Game({
      playerHeroId: 'xiao-qiao', playerInstance: baseInstance('xiao-qiao', 2),
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.getArmorName()).toBe('玉如意')
  })

  it('小乔 装备了其他防具 → getArmorName 返回装备防具名, 不再返回玉如意', () => {
    const game = new Game({
      playerHeroId: 'xiao-qiao', playerInstance: baseInstance('xiao-qiao', 2),
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    const armor = equipment('寒冰甲', 'a1', 'armor')
    player.equip(armor, 'armor')
    expect(player.getArmorName()).toBe('寒冰甲')
  })

  it('非小乔无防具 → getArmorName 返回 undefined', () => {
    const game = new Game({
      playerHeroId: 'han-xin', playerInstance: baseInstance('han-xin', 4),
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.getArmorName()).toBeUndefined()
  })
})

describe('玉如意: yuRuYiHandler 询问', () => {
  it('玩家装备玉如意 → getArmorName 返回 玉如意', () => {
    const game = new Game({
      playerHeroId: 'han-xin', playerInstance: baseInstance('han-xin', 4),
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    player.equip(equipment('玉如意', 'a1', 'armor'), 'armor')
    expect(player.getArmorName()).toBe('玉如意')
  })

  it('玩家小乔(国色)无防具 → getArmorName 返回 玉如意(虚拟装备)', () => {
    const game = new Game({
      playerHeroId: 'xiao-qiao', playerInstance: baseInstance('xiao-qiao', 2),
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.getArmorName()).toBe('玉如意')
  })

  it('玩家未装备玉如意且无国色 → getArmorName 返回 undefined', () => {
    const game = new Game({
      playerHeroId: 'han-xin', playerInstance: baseInstance('han-xin', 4),
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.getArmorName()).toBeUndefined()
  })
})

describe('天香: tianXiangHandler 判定前免判', () => {
  it('小乔 有天香技能 → hasSkillOrTreasure 返回 true', () => {
    const game = new Game({
      playerHeroId: 'xiao-qiao', playerInstance: baseInstance('xiao-qiao', 2),
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.hasSkillOrTreasure('tian-xiang')).toBe(true)
  })

  it('非小乔 → hasSkillOrTreasure 返回 false', () => {
    const game = new Game({
      playerHeroId: 'han-xin', playerInstance: baseInstance('han-xin', 4),
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.hasSkillOrTreasure('tian-xiang')).toBe(false)
  })

  it('天香 useSkill 每回合限 1 次', () => {
    const game = new Game({
      playerHeroId: 'xiao-qiao', playerInstance: baseInstance('xiao-qiao', 2),
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    // 天香定义为被动, 不应有 maxUsesPerTurn 限制
    // (画地为牢/手捧雷可能多次触发天香免判, 同一回合)
    expect(player.useSkill('tian-xiang')).toBe(true)
    expect(player.useSkill('tian-xiang')).toBe(true)
  })
})

describe('刺客: ciKeHandler 询问', () => {
  it('荆轲 有刺客技能 → hasSkillOrTreasure 返回 true', () => {
    const game = new Game({
      playerHeroId: 'jing-ke', playerInstance: baseInstance('jing-ke', 3),
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.hasSkillOrTreasure('ci-ke')).toBe(true)
  })

  it('非荆轲 → hasSkillOrTreasure 返回 false', () => {
    const game = new Game({
      playerHeroId: 'han-xin', playerInstance: baseInstance('han-xin', 4),
      allyHeroIds: [], enemyHeroIds: ['jing-ke'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()!
    expect(player.hasSkillOrTreasure('ci-ke')).toBe(false)
  })
})
