import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'yang-yan-zhao', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

describe('回合顺序', () => {
  it('2敌人: 玩家回合结束后应轮回到玩家', async () => {
    const turnStarts: string[] = []
    let pahCallCount = 0

    const game = new Game({
      playerHeroId: 'yang-yan-zhao',
      playerInstance: baseInstance,
      allyHeroIds: [],
      enemyHeroIds: ['han-xin', 'lv-zhi'],
      playerActionHandler: async () => {
        pahCallCount++
        return null
      },
      responseActionHandler: async () => null,
    })

    game.eventBus.on('turn:start', (e) => {
      if (e.sourceHeroId) turnStarts.push(e.sourceHeroId)
    })

    await game.start()

    console.log('turnStarts:', turnStarts)
    console.log('pahCallCount:', pahCallCount)

    // playerActionHandler 至少被调用2次
    expect(pahCallCount).toBeGreaterThanOrEqual(2)
    // 回合顺序应是 player, enemy1, enemy2, player, enemy1, enemy2, ...
    const playerTurns = turnStarts.filter(id => id === 'yang-yan-zhao')
    expect(playerTurns.length).toBeGreaterThanOrEqual(2)
  })
})
