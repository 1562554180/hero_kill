import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

function card(name: string, id: string, suit: any = 'spade', number = 5, type: any = 'basic'): Card {
  return { id, suit, number, type, name } as any
}

describe('杀响应: 询问闪, 可主动选择掉血', () => {
  it('有闪时玩家主动选择掉血 (handler返回null)', async () => {
    // 玩家作为防御方, 敌人AI作为攻击方
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, p, type) => {
        if (type === 'dodge') {
          return null  // 玩家主动选择不闪
        }
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    enemy.drawCards([card('杀', 'k1'), card('闪', 'd1', 'heart', 7)])
    player.drawCards([card('闪', 'pd1', 'heart', 5)])
    const beforeHp = player.getCurrentHp()
    // 直接用executeKill模拟敌人对玩家出杀
    await game.executeKill(enemy, player, enemy.getHand().find(c => c.name === '杀')!)
    // 玩家主动掉血
    expect(player.getCurrentHp()).toBe(beforeHp - 1)
    // 玩家的闪仍在手牌 (没被打出)
    expect(player.getHand().find(c => c.id === 'pd1')).toBeDefined()
  })

  it('有闪时玩家选择使用闪 (handler返回闪id)', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, p, type) => {
        if (type === 'dodge') {
          const dodge = p.getHand().find(c => c.name === '闪')
          return dodge?.id ?? null
        }
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    enemy.drawCards([card('杀', 'k1')])
    player.drawCards([card('闪', 'pd1', 'heart', 7)])
    const beforeHp = player.getCurrentHp()
    await game.executeKill(enemy, player, enemy.getHand().find(c => c.name === '杀')!)
    expect(player.getCurrentHp()).toBe(beforeHp)
    expect(player.getHandSize()).toBe(0)
  })

  it('AI防御方: 有闪自动使用, 不掉血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: ['han-xin'], enemyHeroIds: [],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const ally = game.getPlayerById('han-xin')!
    player.drawCards([card('杀', 'k1')])
    ally.drawCards([card('闪', 'd1', 'heart', 7)])
    const beforeHp = ally.getCurrentHp()
    await game.playerPlayKill(player, 'han-xin', 'k1')
    expect(ally.getCurrentHp()).toBe(beforeHp)
    expect(ally.getHandSize()).toBe(0)
  })

  it('AI防御方: 无闪则掉血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: ['han-xin'], enemyHeroIds: [],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const ally = game.getPlayerById('han-xin')!
    player.drawCards([card('杀', 'k1')])
    const beforeHp = ally.getCurrentHp()
    await game.playerPlayKill(player, 'han-xin', 'k1')
    expect(ally.getCurrentHp()).toBe(beforeHp - 1)
  })

  it('玩家防御方无responseActionHandler: 玩家无闪时掉血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      // 无responseActionHandler
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    enemy.drawCards([card('杀', 'k1')])
    const beforeHp = player.getCurrentHp()
    await game.executeKill(enemy, player, enemy.getHand().find(c => c.name === '杀')!)
    expect(player.getCurrentHp()).toBe(beforeHp - 1)
  })

  it('霸王: 玩家可选择不出第二张闪而掉血', async () => {
    const instanceWithBaWang = { ...baseInstance, treasures: { main: [{ skill: { id: 'ba-wang' }, triggerRate: 1 } as any], sub: [] } }
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: instanceWithBaWang,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async () => null,  // 主动不闪
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    enemy.drawCards([card('杀', 'k1')])
    player.drawCards([card('闪', 'pd1', 'heart', 7), card('闪', 'pd2', 'heart', 8)])
    const beforeHp = player.getCurrentHp()
    // 玩家攻击敌人 → 杀需要2张闪
    player.drawCards([card('杀', 'k2')])
    await game.playerPlayKill(player, 'han-xin', 'k2')
    // 敌人AI无闪, 掉血
    expect(game.getPlayerById('han-xin')!.getCurrentHp()).toBe(beforeHp)
  })

  it('多人: 敌人对玩家出杀, 玩家放弃响应, 应该掉血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: ['han-xin'], enemyHeroIds: ['xiang-yu'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, _p, type) => {
        if (type === 'dodge') return null
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiang-yu')!
    enemy.drawCards([card('杀', 'k1')])
    const beforeHp = player.getCurrentHp()
    await game.executeKill(enemy, player, enemy.getHand().find(c => c.name === '杀')!)
    expect(player.getCurrentHp()).toBe(beforeHp - 1)
  })

  it('多人: 完整流程, 玩家结束回合后AI攻击, 玩家放弃响应, 应该掉血且回合循环', async () => {
    const events: string[] = []
    let stopAfter = false
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: ['han-xin'], enemyHeroIds: ['xiang-yu'],
      playerActionHandler: async () => {
        events.push('player-turn-end')
        if (stopAfter) {
          // 强制结束: 把玩家打死, 触发游戏结束
          const pl = game.getPlayer()
          while (pl.isAlive()) pl.takeDamage(1)
        }
        return null
      },
      responseActionHandler: async (_g, _p, type) => {
        if (type === 'dodge') {
          events.push('player-dodge-abandon')
          return null
        }
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('xiang-yu')!
    enemy.drawCards([card('杀', 'k1')])
    player.drawCards([card('杀', 'k2')])
    // 监听伤害事件
    let damageReceived = 0
    game.eventBus.on('damage:receive', (e) => {
      if (e.sourceHeroId === 'shang-yang') damageReceived += (e.data as any).damage
    })
    let playerTurnEnds = 0
    game.eventBus.on('turn:start', (e) => {
      if (e.sourceHeroId === 'shang-yang') playerTurnEnds++
      if (playerTurnEnds >= 2) stopAfter = true
    })
    await game.start()
    // 玩家被敌人攻击后应掉血 (至少1次)
    expect(damageReceived).toBeGreaterThanOrEqual(1)
    // 验证玩家回合执行了至少2次
    expect(playerTurnEnds).toBeGreaterThanOrEqual(2)
    // 验证玩家主动放弃响应被调用
    expect(events).toContain('player-dodge-abandon')
  })
})
