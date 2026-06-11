import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'yang-yan-zhao', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

describe('回合顺序: 2敌人时', () => {
  it('玩家结束后应轮回到玩家, 不会卡在敌人间', async () => {
    const turnOrder: string[] = []

    const game = new Game({
      playerHeroId: 'yang-yan-zhao',
      playerInstance: baseInstance,
      allyHeroIds: [],
      enemyHeroIds: ['han-xin', 'lv-zhi'],
      playerActionHandler: async (_g, _p) => {
        return 'endPhase'
      },
    })

    // 监听 turn:start 事件 (在start()前注册, 这样能收到所有事件)
    game.eventBus.on('turn:start', (e) => {
      const id = e.sourceHeroId
      if (id) turnOrder.push(id)
    })

    await game.start()

    console.log('Turn order:', turnOrder)

    // 预期: player → han-xin → lv-zhi → player → han-xin → lv-zhi
    // 但因为AI不出杀就结束, 应该很快结束游戏
    // 主要看前3个以及是否回到player
    expect(turnOrder[0]).toBe('yang-yan-zhao')
    expect(turnOrder[1]).toBe('han-xin')
    expect(turnOrder[2]).toBe('lv-zhi')
    // 关键: 第4个应该回到 player (而不是再次 han-xin)
    expect(turnOrder[3]).toBe('yang-yan-zhao')
  })
})
