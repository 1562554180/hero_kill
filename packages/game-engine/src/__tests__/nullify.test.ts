import { describe, it, expect, vi } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

describe('无懈可击', () => {
  it('无人有无懈可击 → 锦囊正常生效', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      { id: 's1', suit: 'spade', number: 5, type: 'scheme', name: '探囊取物' },
    ])
    enemy.drawCards([
      { id: 'e1', suit: 'heart', number: 3, type: 'basic', name: '杀' },
    ])

    await game.playerPlayScheme(player, 's1', enemy.getId())
    // 探囊取物生效: 玩家偷了敌方一张牌
    expect(player.getHandSize()).toBe(1)
    expect(enemy.getHandSize()).toBe(0)
  })

  it('敌方有无懈可击 → AI 抵消锦囊', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      { id: 's1', suit: 'spade', number: 5, type: 'scheme', name: '探囊取物' },
    ])
    enemy.drawCards([
      { id: 'e1', suit: 'heart', number: 3, type: 'basic', name: '杀' },
      { id: 'wx1', suit: 'diamond', number: 7, type: 'scheme', name: '无懈可击' },
    ])
    // AI 60% 概率抵消, 强制随机为抵消
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    await game.playerPlayScheme(player, 's1', enemy.getId())
    // 被抵消: 玩家没有偷到牌
    expect(player.getHandSize()).toBe(0)
    expect(enemy.getHandSize()).toBe(1)
    vi.restoreAllMocks()
  })

  it('链式: A 抵消原锦囊, B 抵消 A → 原锦囊生效', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      // 玩家(商鞅)也被询问是否出无懈可击
      responseActionHandler: async (_g, p, type, _ctx) => {
        if (type === 'nullify') {
          // 玩家出无懈可击抵消敌方的无懈可击
          const wx = p.getHand().find(c => c.name === '无懈可击')
          return wx?.id ?? null
        }
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      { id: 's1', suit: 'spade', number: 5, type: 'scheme', name: '探囊取物' },
      { id: 'p-wx', suit: 'diamond', number: 1, type: 'scheme', name: '无懈可击' },
    ])
    enemy.drawCards([
      { id: 'e1', suit: 'heart', number: 3, type: 'basic', name: '杀' },
      { id: 'e-wx', suit: 'club', number: 2, type: 'scheme', name: '无懈可击' },
    ])
    // AI 出无懈可击 (enemy 抵消原锦囊)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    await game.playerPlayScheme(player, 's1', enemy.getId())
    // 敌方先抵消(nullified=true), 玩家再抵消(nullified=false) → 原锦囊生效
    expect(player.getHandSize()).toBe(1) // 偷了敌方一张杀 (探囊取物+无懈可击已用掉)
    expect(enemy.getHandSize()).toBe(0)
    vi.restoreAllMocks()
  })

  it('画地为牢被抵消 → 不放置', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      { id: 'hd1', suit: 'heart', number: 5, type: 'scheme', name: '画地为牢', delayed: true } as any,
    ])
    enemy.drawCards([
      { id: 'wx1', suit: 'diamond', number: 7, type: 'scheme', name: '无懈可击' },
    ])
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    await game.playerPlayScheme(player, 'hd1', enemy.getId())
    expect(enemy.getJudgeCards().length).toBe(0)
    vi.restoreAllMocks()
  })

  it('手捧雷被抵消 → 顺延到下一个玩家', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      { id: 't1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any,
    ])
    enemy.drawCards([
      { id: 'wx1', suit: 'diamond', number: 7, type: 'scheme', name: '无懈可击' },
    ])
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    await game.playerPlayScheme(player, 't1')
    // 被抵消后顺延: 玩家无雷, 敌方有雷
    expect(player.getJudgeCards().length).toBe(0)
    expect(enemy.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
    vi.restoreAllMocks()
  })
})
