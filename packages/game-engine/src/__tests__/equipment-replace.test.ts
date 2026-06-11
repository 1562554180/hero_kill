import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

function makeEquipment(name: string, slot: 'weapon' | 'armor' | 'attackMount' | 'defenseMount', range?: number, suit: any = 'spade', number = 1): Card {
  return {
    id: `eq-${name}-${suit}-${number}`,
    suit,
    number,
    type: 'equipment',
    name,
    slot,
    range,
    description: `test ${name}`,
  } as any
}

describe('装备替换: 旧装备弃入牌堆, 新装备生效', () => {
  it('武器替换: 旧武器进弃牌堆, 新武器生效', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    player.drawCards([
      makeEquipment('虎符', 'weapon', 1, 'spade', 1),
      makeEquipment('霸王弓', 'weapon', 5, 'club', 1),
    ])
    // 装备虎符
    game.playerEquipCard(player, 'eq-虎符-spade-1')
    expect(player.getWeaponName()).toBe('虎符')
    // 替换为霸王弓
    game.playerEquipCard(player, 'eq-霸王弓-club-1')
    expect(player.getWeaponName()).toBe('霸王弓')
    // 新武器在装备区 (不是弃牌堆)
    const discardPile: any = (game as any).cardDeck.discardPile
    const hasOldWeapon = discardPile.some((c: Card) => c.id === 'eq-虎符-spade-1')
    const hasNewWeapon = discardPile.some((c: Card) => c.id === 'eq-霸王弓-club-1')
    expect(hasOldWeapon).toBe(true)
    expect(hasNewWeapon).toBe(false)
  })

  it('防具替换: 乾坤袋→玉如意 (乾坤袋被替换时摸1张)', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    player.drawCards([
      makeEquipment('乾坤袋', 'armor', undefined, 'heart', 3),
      makeEquipment('玉如意', 'armor', undefined, 'diamond', 2),
    ])
    game.playerEquipCard(player, 'eq-乾坤袋-heart-3')
    const beforeHand = player.getHandSize()  // 玉如意还在手
    game.playerEquipCard(player, 'eq-玉如意-diamond-2')
    expect(player.getArmorName()).toBe('玉如意')
    // 乾坤袋被替换 → 摸1张 → 净0
    expect(player.getHandSize()).toBe(beforeHand)
    const discardPile: any = (game as any).cardDeck.discardPile
    expect(discardPile.some((c: Card) => c.id === 'eq-乾坤袋-heart-3')).toBe(true)
    expect(discardPile.some((c: Card) => c.id === 'eq-玉如意-diamond-2')).toBe(false)
  })

  it('马替换: 进攻马→防御马', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    player.drawCards([
      makeEquipment('进攻马', 'attackMount', undefined, 'diamond', 5),
      makeEquipment('防御马', 'defenseMount', undefined, 'heart', 5),
    ])
    game.playerEquipCard(player, 'eq-进攻马-diamond-5')
    expect(player.getEquippedCard('attackMount')?.name).toBe('进攻马')
    // 替换: 但进攻马和防御马不是同一槽位, 应该共存而不是替换
    game.playerEquipCard(player, 'eq-防御马-heart-5')
    expect(player.getEquippedCard('attackMount')?.name).toBe('进攻马')
    expect(player.getEquippedCard('defenseMount')?.name).toBe('防御马')
    // 进攻马仍在装备区, 防御马也在
    const discardPile: any = (game as any).cardDeck.discardPile
    expect(discardPile.length).toBe(0)
  })

  it('乾坤袋被探囊取物拿走: 目标摸1张', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      tanNangTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      tanNangPickHandler: async (_g, _p, _t, options) => options.equipment[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    const qkd = makeEquipment('乾坤袋', 'armor', undefined, 'heart', 3)
    player.drawCards([{ id: 'tn1', suit: 'club', number: 3, type: 'scheme', name: '探囊取物' } as any])
    enemy.drawCards([qkd])
    // 装备乾坤袋
    game.playerEquipCard(enemy, qkd.id)
    expect(enemy.getEquippedCard('armor')?.name).toBe('乾坤袋')
    // 探囊取物拿走乾坤袋
    await game.playerPlayScheme(player, 'tn1')
    // 乾坤袋被拿走 → enemy 摸1张
    expect(enemy.getEquippedCard('armor')).toBeUndefined()
    expect(enemy.getHandSize()).toBe(1)  // 摸了1张
  })

  it('乾坤袋被釜底抽薪弃掉: 目标摸1张', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      fudiTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      fudiPickHandler: async (_g, _p, _t, options) => options.equipment[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    const qkd = makeEquipment('乾坤袋', 'armor', undefined, 'heart', 3)
    player.drawCards([{ id: 'fd1', suit: 'spade', number: 3, type: 'scheme', name: '釜底抽薪' } as any])
    enemy.drawCards([qkd])
    game.playerEquipCard(enemy, qkd.id)
    expect(enemy.getEquippedCard('armor')?.name).toBe('乾坤袋')
    await game.playerPlayScheme(player, 'fd1')
    // 乾坤袋被弃 → enemy 摸1张
    expect(enemy.getEquippedCard('armor')).toBeUndefined()
    expect(enemy.getHandSize()).toBe(1)
  })
})