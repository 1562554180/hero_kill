import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance } from '@hero-legend/shared-types'

describe('Game', () => {
  it('should create a game and run to completion', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'yu-ji',
      level: 1,
      growthValue: 0,
      starLevel: 3,
      treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'yu-ji',
      playerInstance,
      allyHeroIds: ['cheng-yao-jin'],
      enemyHeroIds: ['lv-zhi'],
    })

    const result = await game.start()
    expect(result).toBeDefined()
    expect(result.turnCount).toBeGreaterThan(0)
    expect([true, false]).toContain(result.won)
  })

  it('should emit game:start event', async () => {
    const playerInstance: HeroInstance = {
      heroId: 'xiang-yu',
      level: 1,
      growthValue: 0,
      starLevel: 4,
      treasures: { main: [], sub: [] },
    }

    const game = new Game({
      playerHeroId: 'xiang-yu',
      playerInstance,
      allyHeroIds: [],
      enemyHeroIds: ['xiao-qiao'],
    })

    const events: string[] = []
    game.eventBus.on('game:start', () => events.push('start'))

    await game.start()
    expect(events).toContain('start')
  })
})
