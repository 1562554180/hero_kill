import { describe, it, expect, vi } from 'vitest'
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

    expect((game as any).skipCurrentTurnPlayerId).toBeNull()
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

    expect((game as any).skipCurrentTurnPlayerId).toBe(player.getId())
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

    expect((game as any).skipCurrentTurnPlayerId).toBe(player.getId())
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

describe('变法链: 链式替换, 以最后一个为准', () => {
  // 注入变法技能到一个英雄上 (用于测试)
  function injectBianFa(player: any) {
    player.hero.hero.skills.push({
      id: 'bian-fa', name: '变法', type: 'active',
      description: '判定牌生效前可弃一张手牌替换', maxUsesPerTurn: 1,
    })
  }

  it('判定方无变法, 顺延到下一个有变法的玩家', async () => {
    // player = 岳飞 (无变法), enemy = xiao-qiao (注入变法)
    const playerInst: HeroInstance = {
      heroId: 'yue-fei', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }
    const game = new Game({
      playerHeroId: 'yue-fei', playerInstance: playerInst,
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: async (_g, p) => p.getHand()[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiao-qiao')!
    injectBianFa(enemy)
    player.drawCards([{ id: 'y-1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    enemy.drawCards([{ id: 'x-1', suit: 'heart', number: 2, type: 'basic', name: '杀' }])
    // AI 强制替换 (绕过 50% 随机)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    const result = await game.judge(player)
    // 岳飞(判定方)无变法 → 跳过, 小乔(注入变法)用红桃2替换
    expect(result.suit).toBe('heart')
    expect(result.card.number).toBe(2)
    vi.restoreAllMocks()
  })

  it('多个变法玩家链式修改, 以最后一个为准', async () => {
    // player = 商鞅 (有变法), enemy = xiao-qiao (注入变法)
    // 判定方 = player (商鞅), 顺时针: player → enemy
    // player 的手牌决定第一次替换, enemy 的手牌决定最终结果
    const playerInst: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: playerInst,
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: async (_g, p) => p.getHand()[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiao-qiao')!
    injectBianFa(enemy)
    // 玩家手牌: 红桃7 (第一次替换)
    player.drawCards([{ id: 'p-7', suit: 'heart', number: 7, type: 'basic', name: '杀' }])
    // 敌人手牌: 黑桃3 (最终结果)
    enemy.drawCards([{ id: 'e-3', suit: 'spade', number: 3, type: 'basic', name: '杀' }])
    // AI 强制替换
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    const result = await game.judge(player)
    // 商鞅先用红桃7替换, 小乔再用黑桃3替换(以最后一个为准)
    expect(result.suit).toBe('spade')
    expect(result.card.number).toBe(3)
    vi.restoreAllMocks()
  })

  it('无变法玩家时, 不替换, 原始判定牌生效', async () => {
    // player = 岳飞 (无变法), enemy = xiao-qiao (无变法)
    const playerInst: HeroInstance = {
      heroId: 'yue-fei', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }
    const game = new Game({
      playerHeroId: 'yue-fei', playerInstance: playerInst,
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      // judgeActionHandler 不该被调用
      judgeActionHandler: async () => { throw new Error('不应被调用') },
    })
    const player = game.getPlayer()
    // 玩家有 1 张红桃手牌(用于其它场景, 本测试应不被使用)
    player.drawCards([{ id: 'h', suit: 'heart', number: 5, type: 'basic', name: '杀' }])
    // 直接调 judge, 没有任何变法玩家
    const result = await game.judge(player)
    // 牌堆顶的原牌生效 (不一定是红桃5, 但保证不被替换)
    expect(result).toBeDefined()
  })

  it('变法链触发 skill:trigger 事件: 每人1次', async () => {
    const playerInst: HeroInstance = {
      heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
    }
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: playerInst,
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      judgeActionHandler: async (_g, p) => p.getHand()[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiao-qiao')!
    injectBianFa(enemy)
    player.drawCards([{ id: 'p', suit: 'heart', number: 7, type: 'basic', name: '杀' }])
    enemy.drawCards([{ id: 'e', suit: 'spade', number: 3, type: 'basic', name: '杀' }])
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    const triggers: any[] = []
    game.eventBus.on('skill:trigger', (ev: any) => {
      if (ev.data?.skillName === '变法') triggers.push(ev)
    })
    await game.judge(player)
    // 商鞅 + 小乔 各触发1次
    expect(triggers.length).toBe(2)
    vi.restoreAllMocks()
  })
})
