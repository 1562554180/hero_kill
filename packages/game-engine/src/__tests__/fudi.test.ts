import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

function scheme(name: string, id: string): Card {
  return { id, suit: 'spade', number: 5, type: 'scheme', name } as any
}

describe('釜底抽薪: 弃1张牌 (无距离限制)', () => {
  it('无距离限制: 敌人前后都有防御马也可使用', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      fudiTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      fudiPickHandler: async (_g, _p, _t, options) => options.hand[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('釜底抽薪', 'fd1')])
    enemy.drawCards([
      { id: 'dm', suit: 'heart', number: 5, type: 'equipment', name: '防御马', slot: 'defenseMount', description: '' } as any,
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(enemy, 'dm')
    // 探囊取物不可用, 釜底抽薪可绕过距离
    expect(game.canTanNang(player, enemy)).toBe(false)
    const beforeHand = enemy.getHandSize()
    await game.playerPlayScheme(player, 'fd1')
    // 釜底抽薪弃对方1张牌
    expect(enemy.getHandSize()).toBe(beforeHand - 1)
  })

  it('玩家选目标后选牌: 弃手牌中的指定牌', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      fudiTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      fudiPickHandler: async (_g, _p, _t, options) => options.hand.find(c => c.id === 'e2')?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('釜底抽薪', 'fd1')])
    enemy.drawCards([
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
      { id: 'e2', suit: 'spade', number: 2, type: 'basic', name: '杀' } as any,
      { id: 'e3', suit: 'spade', number: 3, type: 'basic', name: '杀' } as any,
    ])
    await game.playerPlayScheme(player, 'fd1')
    // e2 被弃
    expect(enemy.getHand().find(c => c.id === 'e2')).toBeUndefined()
    expect(enemy.getHandSize()).toBe(2)
  })

  it('可弃装备/判定', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      fudiTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      fudiPickHandler: async (_g, _p, _t, options) => options.equipment[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('釜底抽薪', 'fd1')])
    enemy.drawCards([
      { id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '虎符', slot: 'weapon', range: 1, description: '' } as any,
    ])
    game.playerEquipCard(enemy, 'w1')
    await game.playerPlayScheme(player, 'fd1')
    // 武器被弃
    expect(enemy.getEquippedCard('weapon')).toBeUndefined()
  })

  it('目标无牌: 跳过但仍消耗', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('釜底抽薪', 'fd1')])
    // 敌人空
    await game.playerPlayScheme(player, 'fd1')
    // 釜底抽薪已打出(进入弃牌堆), 敌人无变化
    expect(enemy.getHandSize()).toBe(0)
    expect(enemy.getEquippedCard('weapon')).toBeUndefined()
  })
})