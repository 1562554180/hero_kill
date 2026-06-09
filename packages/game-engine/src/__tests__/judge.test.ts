import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import { JudgePhase } from '../phases/JudgePhase'
import type { HeroInstance } from '@hero-legend/shared-types'

/** 强制把判定结果设为指定花色数字（通过 judgeActionHandler 替换） */
function forceJudgeSuit(suit: 'heart' | 'diamond' | 'spade' | 'club', number: number) {
  return async (g: any, p: any, judgeCard: any) => {
    const hand = p.getHand()
    if (hand.length === 0) return null
    const newCard = { ...hand[0], suit, number, id: hand[0].id }
    // 替换手牌的第一张为指定花色数字
    p.removeCard(hand[0].id)
    p.drawCards([newCard])
    return newCard.id
  }
}

describe('JudgePhase with forced results', () => {
  it('画地为牢: ♥=失效 (no skipCurrentTurn)', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('heart', 5),
    })

    const player = game.getPlayer()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'hd1', suit: 'heart', number: 5, type: 'scheme', name: '画地为牢', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect((game as any).skipCurrentTurn).toBe(false)
  })

  it('画地为牢: ♦=生效 (skipCurrentTurn=true)', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('diamond', 5),
    })

    const player = game.getPlayer()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'hd1', suit: 'heart', number: 5, type: 'scheme', name: '画地为牢', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect((game as any).skipCurrentTurn).toBe(true)
  })

  it('画地为牢: ♠=生效', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('spade', 5),
    })

    const player = game.getPlayer()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'hd1', suit: 'heart', number: 5, type: 'scheme', name: '画地为牢', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect((game as any).skipCurrentTurn).toBe(true)
  })

  it('手捧雷: ♠5=生效 3血', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('spade', 5),
    })

    const player = game.getPlayer()
    const initialHp = player.getCurrentHp()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'sp1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect(player.getCurrentHp()).toBe(initialHp - 3)
  })

  it('手捧雷: ♠1=失效 (1在2-9之外)', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('spade', 1),
    })

    const player = game.getPlayer()
    const initialHp = player.getCurrentHp()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'sp1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect(player.getCurrentHp()).toBe(initialHp)
  })

  it('手捧雷: ♥5=失效 (非黑桃)', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('heart', 5),
    })

    const player = game.getPlayer()
    const initialHp = player.getCurrentHp()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'sp1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect(player.getCurrentHp()).toBe(initialHp)
  })

  it('手捧雷: ♠10=失效 (10在2-9之外)', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance, allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      judgeActionHandler: forceJudgeSuit('spade', 10),
    })

    const player = game.getPlayer()
    const initialHp = player.getCurrentHp()
    player.drawCards([{ id: 'h1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.addJudgeCard({ id: 'sp1', suit: 'spade', number: 1, type: 'scheme', name: '手捧雷', delayed: true })

    const phase = new JudgePhase()
    await phase.execute({ player, cardDeck: game.cardDeck, eventBus: game.eventBus, game })

    expect(player.getCurrentHp()).toBe(initialHp)
  })
})
