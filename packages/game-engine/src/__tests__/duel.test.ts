import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance } from '@hero-legend/shared-types'

function setupGame(opts: { withResponse?: (p: any) => string | null } = {}) {
  const playerInstance: HeroInstance = {
    heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
  }
  const game = new Game({
    playerHeroId: 'shang-yang', playerInstance,
    allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
    playerActionHandler: async () => null,
  })
  if (opts.withResponse) {
    ;(game as any).config.responseActionHandler = async (_g: any, p: any) => opts.withResponse!(p)
  }
  return { game, player: game.getPlayer(), enemy: game.getPlayerById('xiao-qiao')! }
}

describe('决斗 (Duel)', () => {
  it('目标无杀时, 目标掉1血', async () => {
    const { game, player, enemy } = setupGame()
    const initialHp = enemy.getCurrentHp()
    await game.executeDuel(player, enemy)
    expect(enemy.getCurrentHp()).toBe(initialHp - 1)
  })

  it('双方各有1杀: 交替后 enemy 用完, 输1血', async () => {
    const { game, player, enemy } = setupGame({
      withResponse: (p) => p.getHand().find((c: any) => c.name === '杀')?.id ?? null,
    })
    enemy.drawCards([{ id: 'e1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    player.drawCards([{ id: 'p1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    const initialEnemyHp = enemy.getCurrentHp()
    await game.executeDuel(player, enemy)
    // 流程: enemy(1杀)→player(1杀)→enemy(无)→enemy输
    expect(enemy.getCurrentHp()).toBe(initialEnemyHp - 1)
  })

  it('AI 主动方有杀, 目标无杀: 目标输', async () => {
    const { game, player, enemy } = setupGame()
    player.drawCards([{ id: 'p1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    // enemy 无杀
    const initialEnemyHp = enemy.getCurrentHp()
    await game.executeDuel(player, enemy)
    // 流程: enemy(无)→enemy输1血
    expect(enemy.getCurrentHp()).toBe(initialEnemyHp - 1)
  })

  it('主动方无杀, 目标有杀: 主动方输', async () => {
    const { game, player, enemy } = setupGame()
    enemy.drawCards([{ id: 'e1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    enemy.drawCards([{ id: 'e2', suit: 'spade', number: 6, type: 'basic', name: '杀' }])
    const initialPlayerHp = player.getCurrentHp()
    await game.executeDuel(player, enemy)
    // 流程: enemy(1杀)→player(无)→player输
    expect(player.getCurrentHp()).toBe(initialPlayerHp - 1)
  })

  it('霸王: 上一轮出杀者有霸王, 下一轮需要2张杀', async () => {
    const { game, player, enemy } = setupGame({
      withResponse: (p) => p.getHand().find((c: any) => c.name === '杀')?.id ?? null,
    })
    // player 装备 霸王
    ;(player as any).hero.instance.treasures.main = [
      { id: 'bw', skill: { id: 'ba-wang', name: '霸王', description: '需2张杀' }, starLevel: 5, name: '霸王' } as any,
    ]
    // enemy 有2张杀, player 有1张杀
    enemy.drawCards([{ id: 'e1', suit: 'spade', number: 5, type: 'basic', name: '杀' }])
    enemy.drawCards([{ id: 'e2', suit: 'spade', number: 6, type: 'basic', name: '杀' }])
    player.drawCards([{ id: 'p1', suit: 'spade', number: 7, type: 'basic', name: '杀' }])
    // 流程: enemy(1杀)→player(1杀, 触发霸王, enemy下一轮要2张)→enemy(出1张, 还需1张)→enemy(出另1张)→player需杀
    // player已无杀 → player输
    const initialPlayerHp = player.getCurrentHp()
    await game.executeDuel(player, enemy)
    expect(player.getCurrentHp()).toBe(initialPlayerHp - 1)
  })

  it('傲剑 主动模式: 红色非杀牌可当杀', async () => {
    const playerInst: HeroInstance = {
      heroId: 'yang-yan-zhao', level: 1, growthValue: 0, starLevel: 3,
      treasures: { main: [{ id: 't1', skill: { id: 'ao-jian', name: '傲剑', description: '红色当杀' }, starLevel: 5, name: '傲剑' } as any], sub: [] },
    }
    const game = new Game({
      playerHeroId: 'yang-yan-zhao', playerInstance: playerInst,
      allyHeroIds: [], enemyHeroIds: ['xiao-qiao'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, p) => p.getHand().find((c: any) => c.suit === 'heart' || c.suit === 'diamond')?.id ?? null,
    })
    const p2 = game.getPlayer()
    const e2 = game.getPlayerById('xiao-qiao')!
    p2.drawCards([{ id: 'p-red', suit: 'heart', number: 5, type: 'basic', name: '药' }])
    e2.drawCards([{ id: 'e-kill', suit: 'spade', number: 5, type: 'basic', name: '杀' }])

    // 激活傲剑 (模拟 UI 点击)
    game.activateAoJian(p2.getId())

    const initialPlayerHp = p2.getCurrentHp()
    const initialEnemyHp = e2.getCurrentHp()
    await game.executeDuel(p2, e2)
    // 流程: e2用e-kill → p2用p-red(傲剑) → e2无杀 → e2输
    expect(p2.getCurrentHp()).toBe(initialPlayerHp)
    expect(e2.getCurrentHp()).toBe(initialEnemyHp - 1)
  })
})
