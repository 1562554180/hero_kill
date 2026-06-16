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

  it('画地为牢: 使用时不支持抵消, 直接放判定区', async () => {
    // 延时锦囊在 play 阶段不支持无懈可击, 判定前才响应
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
    // 即便敌方有 无懈可击, play 阶段画地为牢也应直接放置 (判定阶段才响应)
    await game.playerPlayScheme(player, 'hd1', enemy.getId())
    expect(enemy.getJudgeCards().length).toBe(1)
  })

  it('手捧雷: 使用时不支持抵消, 直接放判定区', async () => {
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
    await game.playerPlayScheme(player, 't1')
    // play 阶段不支持无懈可击, 雷直接放到自己判定区
    expect(player.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
  })

  it('画地为牢: 判定阶段链式响应 - 玩家抵消敌方抵消, 画地为牢生效', async () => {
    // 玩家出 画地为牢 放到敌方判定区
    // 进入敌方判定阶段: 敌方先出无懈可击 → 玩家出无懈可击 → 画地为牢继续判定
    let playerUsedWx = false
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, p, type) => {
        if (type === 'nullify' && p.getRole() === 'player' && !playerUsedWx) {
          playerUsedWx = true
          const wx = p.getHand().find(c => c.name === '无懈可击')
          return wx?.id ?? null
        }
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      { id: 'hd1', suit: 'heart', number: 5, type: 'scheme', name: '画地为牢', delayed: true } as any,
      { id: 'p-wx', suit: 'diamond', number: 1, type: 'scheme', name: '无懈可击' },
    ])
    enemy.drawCards([
      { id: 'e-wx', suit: 'club', number: 2, type: 'scheme', name: '无懈可击' },
    ])
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 敌方AI会出无懈可击

    // 玩家出画地为牢: 放到敌方判定区 (play阶段不响应)
    await game.playerPlayScheme(player, 'hd1', enemy.getId())
    expect(enemy.getJudgeCards().find(c => c.name === '画地为牢')).toBeDefined()

    // 模拟进入敌方判定阶段, 手动调用 checkJudgeNullify
    const fromPlayer = player
    const judgeNullified = await game.checkJudgeNullify(enemy, '画地为牢', fromPlayer)
    // 敌方先出无懈可击(true)→ 玩家再出(false) → 最终未被抵消
    expect(judgeNullified).toBe(false)
    vi.restoreAllMocks()
  })

  it('链式: 玩家抵消敌方抵消, 敌方再次抵消 → 原锦囊失效', async () => {
    // 3轮抵消: 原→敌方(失效)→玩家(恢复)→敌方(再次失效)
    let playerResponded = false
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, p, type) => {
        if (type === 'nullify') {
          if (playerResponded) return null
          playerResponded = true
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
      { id: 'e-wx1', suit: 'club', number: 2, type: 'scheme', name: '无懈可击' },
      { id: 'e-wx2', suit: 'club', number: 3, type: 'scheme', name: '无懈可击' },
    ])
    // AI 在两次被询问时都出无懈可击
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount <= 2 ? 0.05 : 0.95
    })

    await game.playerPlayScheme(player, 's1', enemy.getId())
    // 链: 原→敌方(nullified=true)→玩家(nullified=false)→敌方(nullified=true)
    // 探囊取物最终被抵消, 玩家没拿到牌
    expect(player.getHandSize()).toBe(0)  // 探囊取物 + 无懈可击 都用掉
    expect(enemy.getHandSize()).toBe(1)   // 杀还在 (探囊取物失效)
    vi.restoreAllMocks()
  })
})
