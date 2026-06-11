import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game.js'
import type { Card } from '@hero-legend/shared-types'

function makeCard(id: string, name: string, suit: any = 'spade', number = 1): Card {
  return { id, suit, number, type: 'basic', name } as any
}
function makeEquip(id: string, name: string): Card {
  return { id, suit: 'spade', number: 1, type: 'equipment', name, slot: 'weapon', range: 1 } as any
}

// 自动选前2张手牌
const autoDualCard = async (_game: Game, player: any): Promise<string[]> => {
  return (player as any).getHand().slice(0, 2).map((c: Card) => c.id)
}

describe('芦叶枪 + 天狼', () => {
  it('杨延昭(天狼) + 芦叶枪: 连续使用2次后 canPlayKill 仍为 true', async () => {
    const game = new Game({
      playerHeroId: 'yang-yan-zhao',
      playerInstance: { heroId: 'yang-yan-zhao', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] } },
      allyHeroIds: [],
      enemyHeroIds: ['zhu-yuan-zhang'],
      playerActionHandler: async () => null,
      dualCardHandler: autoDualCard,
    })
    const player = game.getPlayer()!
    player.drawCards([makeEquip('weap', '芦叶枪')])
    game.playerEquipCard(player, 'weap')

    expect((game as any).hasUnlimitedKill(player)).toBe(true)
    expect(game.canPlayKill).toBe(true)

    player.drawCards([
      makeCard('c1', '杀'), makeCard('c2', '杀'), makeCard('c3', '杀'),
      makeCard('c4', '闪'), makeCard('c5', '闪'), makeCard('c6', '药'),
    ])

    // 第1次芦叶枪
    await game.playerUseLuYeQiang(player)
    expect(game.canPlayKill, '第1次后 canPlayKill').toBe(true)
    expect(player.getHandSize(), '第1次后手牌').toBe(4)

    // 第2次芦叶枪
    await game.playerUseLuYeQiang(player)
    expect(game.canPlayKill, '第2次后 canPlayKill').toBe(true)
    expect(player.getHandSize(), '第2次后手牌').toBe(2)
  })

  it('天狼宝具 + 芦叶枪: 连续使用2次后 canPlayKill 仍为 true', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang',
      playerInstance: {
        heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3,
        treasures: {
          main: [{
            id: 't-tian-lang', name: '天狼', type: 'main',
            skill: { id: 'treasure-tian-lang', name: '天狼', type: 'passive', description: 'test' },
            triggerRate: 1.0, starLevel: 5,
          }],
          sub: [],
        },
      },
      allyHeroIds: [],
      enemyHeroIds: ['zhu-yuan-zhang'],
      playerActionHandler: async () => null,
      dualCardHandler: autoDualCard,
    })
    const player = game.getPlayer()!
    player.drawCards([makeEquip('weap', '芦叶枪')])
    game.playerEquipCard(player, 'weap')

    expect((game as any).hasUnlimitedKill(player)).toBe(true)
    expect(game.canPlayKill).toBe(true)

    player.drawCards([
      makeCard('c1', '杀'), makeCard('c2', '杀'), makeCard('c3', '杀'),
      makeCard('c4', '闪'), makeCard('c5', '闪'), makeCard('c6', '药'),
    ])

    await game.playerUseLuYeQiang(player)
    expect(game.canPlayKill, '第1次后 canPlayKill').toBe(true)
    expect(player.getHandSize(), '第1次后手牌').toBe(4)

    await game.playerUseLuYeQiang(player)
    expect(game.canPlayKill, '第2次后 canPlayKill').toBe(true)
    expect(player.getHandSize(), '第2次后手牌').toBe(2)
  })

  it('无天狼 + 芦叶枪: 使用1次后 canPlayKill 变为 false', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang',
      playerInstance: { heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] } },
      allyHeroIds: [],
      enemyHeroIds: ['zhu-yuan-zhang'],
      playerActionHandler: async () => null,
      dualCardHandler: autoDualCard,
    })
    const player = game.getPlayer()!
    player.drawCards([makeEquip('weap', '芦叶枪')])
    game.playerEquipCard(player, 'weap')

    expect((game as any).hasUnlimitedKill(player)).toBe(false)
    expect(game.canPlayKill).toBe(true)

    player.drawCards([
      makeCard('c1', '杀'), makeCard('c2', '杀'), makeCard('c3', '杀'),
      makeCard('c4', '闪'), makeCard('c5', '闪'), makeCard('c6', '药'),
    ])

    await game.playerUseLuYeQiang(player)
    expect(game.canPlayKill, '无天狼: 第1次后 canPlayKill').toBe(false)
  })
})
