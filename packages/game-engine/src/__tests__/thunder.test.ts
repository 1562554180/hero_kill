import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import { JudgePhase } from '../phases/JudgePhase'
import type { HeroInstance } from '@hero-legend/shared-types'

function makeCard(suit: any, number: number, name: string, type: 'basic' | 'scheme' = 'basic', id?: string) {
  return { id: id ?? `c-${Math.random()}`, suit, number, type, name, ...(type === 'scheme' ? { delayed: true } : {}) }
}

/** 强制把判定结果设为指定花色数字 */
function forceJudgeSuit(suit: 'heart' | 'diamond' | 'spade' | 'club', number: number) {
  return async (g: any, p: any, judgeCard: any) => {
    const hand = p.getHand()
    if (hand.length === 0) return null
    const newCard = { ...hand[0], suit, number, id: hand[0].id }
    p.removeCard(hand[0].id)
    p.drawCards([newCard])
    return newCard.id
  }
}

describe('手捧雷: 持续标记 + 链式传递', () => {
  it('手捧雷 ♠5=生效, 当前玩家掉3血, 标记消失', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('spade', 5),
    })

    const player = game.getPlayer()
    const initialHp = player.getCurrentHp()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 't1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect(player.getCurrentHp()).toBe(initialHp - 3)
    // 标记消失 (进了弃牌堆)
    expect(player.getJudgeCards().find(c => c.name === '手捧雷')).toBeUndefined()
  })

  it('手捧雷 ♥5=失效, 顺延给下一个存活无雷玩家', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('heart', 5),
    })

    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiao-qiao')!
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 't1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    // player 没有雷了
    expect(player.getJudgeCards().find(c => c.name === '手捧雷')).toBeUndefined()
    // enemy 拿到了雷
    expect(enemy.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
  })

  it('手捧雷 ♠1=失效 (1在2-9之外), 顺延', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('spade', 1),
    })

    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiao-qiao')!
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 't1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect(enemy.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
  })

  it('下一玩家已有雷时, 跳过, 传给再下一个', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance,
      allyHeroIds: ['cheng-yao-jin'],  // 友军1
      enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('heart', 5),
    })

    const player = game.getPlayer()
    const ally = game.getPlayerById('cheng-yao-jin')!
    const enemy = game.getPlayerById('xiao-qiao')!

    // 友军已有一张雷
    ally.addJudgeCard({ id: 't-existing', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 't-new', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    // player 没了
    expect(player.getJudgeCards().find(c => c.name === '手捧雷')).toBeUndefined()
    // ally 还是只有 1 张
    expect(ally.getJudgeCards().filter(c => c.name === '手捧雷').length).toBe(1)
    // enemy 收到了
    expect(enemy.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
  })

  it('雷 已达上限, 失效后保留在当前玩家', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('heart', 5),
    })

    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiao-qiao')!

    // 敌人已有一张雷 (总2张 = 存活数2, 已达上限)
    enemy.addJudgeCard({ id: 't-existing', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 't-new', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    // player 保留雷
    expect(player.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
    // enemy 不会多一张
    expect(enemy.getJudgeCards().filter(c => c.name === '手捧雷').length).toBe(1)
  })
})

describe('playerPlayScheme 手捧雷', () => {
  it('手捧雷: 标记给自己, 不会影响其他角色', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
    })

    const player = game.getPlayer()
    const thunder: any = { id: 't1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true }
    player.drawCards([thunder])

    // 通过 playerActionHandler 触发 (使用一个真正会结束出牌的 handler)
    game.playerPlayScheme(player, 't1', 'xiao-qiao')  // 即使传了 targetId, 手捧雷也会强制给自己

    expect(player.getJudgeCards().find(c => c.name === '手捧雷')).toBeDefined()
    const enemy = game.getPlayerById('xiao-qiao')!
    expect(enemy.getJudgeCards().find(c => c.name === '手捧雷')).toBeUndefined()
  })

  it('手捧雷: 已有雷时不能叠加', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
    })

    const player = game.getPlayer()
    // 已有雷
    player.addJudgeCard({ id: 't-existing', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true } as any)
    // 再出一张雷
    const thunder: any = { id: 't1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true }
    player.drawCards([thunder])

    game.playerPlayScheme(player, 't1')

    // 玩家手牌退回
    expect(player.getHand().find(c => c.id === 't1')).toBeDefined()
    // 判定区仍然只有一张
    expect(player.getJudgeCards().filter(c => c.name === '手捧雷').length).toBe(1)
  })
})
