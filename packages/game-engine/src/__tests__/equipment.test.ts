import { describe, it, expect, vi } from 'vitest'
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

// 便捷工具：返回装备ID
const eid = (name: string, suit: any = 'spade', number = 1) => `eq-${name}-${suit}-${number}`

describe('装备系统', () => {
  it('虎符: 可无限出杀', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    const enemy2 = game.getPlayerById('wu-ze-tian')!
    player.drawCards([
      makeEquipment('虎符', 'weapon', 1),
    ])
    player.drawCards([
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' },
      { id: 'k2', suit: 'heart', number: 7, type: 'basic', name: '杀' },
      { id: 'k3', suit: 'heart', number: 9, type: 'basic', name: '杀' },
    ] as any)
    enemy.takeDamage(99)  // 已被打死

    // 装备虎符
    game.playerEquipCard(player, eid('虎符'))
    expect(player.getWeaponName()).toBe('虎符')
    expect(game.canPlayKill).toBe(true)

    const beforeHp = enemy2.getCurrentHp()
    await game.playerPlayKill(player, enemy2.getId(), 'k1')
    await game.playerPlayKill(player, enemy2.getId(), 'k2')
    await game.playerPlayKill(player, enemy2.getId(), 'k3')
    expect(enemy2.getCurrentHp()).toBe(beforeHp - 3)
  })

  it('盘龙棍: 杀被闪避后继续出杀 (连续)', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      makeEquipment('盘龙棍', 'weapon', 3),
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
      { id: 'k2', suit: 'heart', number: 7, type: 'basic', name: '杀' } as any,
    ])
    // 敌人只有1张闪
    enemy.drawCards([
      { id: 'd1', suit: 'heart', number: 5, type: 'basic', name: '闪' } as any,
    ])
    game.playerEquipCard(player, eid('盘龙棍'))
    expect(player.getWeaponName()).toBe('盘龙棍')

    const beforeHp = enemy.getCurrentHp()
    await game.playerPlayKill(player, enemy.getId(), 'k1')
    // 第一张杀被闪避 → 盘龙棍触发继续出杀 → 第二张杀命中 → 掉1血
    expect(enemy.getCurrentHp()).toBe(beforeHp - 1)
  })

  it('乾坤袋: 手牌上限+1', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    expect(player.getHandLimit()).toBe(player.getCurrentHp())
    player.drawCards([makeEquipment('乾坤袋', 'armor', undefined, 'heart', 3)])
    game.playerEquipCard(player, eid('乾坤袋', 'heart', 3))
    expect(player.getArmorName()).toBe('乾坤袋')
    expect(player.getHandLimit()).toBe(player.getCurrentHp() + 1)
  })

  it('乾坤袋被替换: 摸1张牌', async () => {
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
    game.playerEquipCard(player, eid('乾坤袋', 'heart', 3))
    expect(player.getHandSize()).toBe(1)  // 玉如意还在手
    // 替换为玉如意
    const beforeHand = player.getHandSize()
    game.playerEquipCard(player, eid('玉如意', 'diamond', 2))
    // 乾坤袋被替换 → 摸1张
    expect(player.getHandSize()).toBe(beforeHand)
    expect(player.getArmorName()).toBe('玉如意')
  })

  it('霸王弓: 杀命中后拆马', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      makeEquipment('霸王弓', 'weapon', 5, 'club', 1),
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
    ])
    enemy.drawCards([
      makeEquipment('进攻马', 'attackMount', undefined, 'diamond', 5),
    ])
    game.playerEquipCard(player, eid('霸王弓', 'club', 1))
    game.playerEquipCard(enemy, eid('进攻马', 'diamond', 5))
    expect(enemy.getEquippedCard('attackMount')?.name).toBe('进攻马')

    await game.playerPlayKill(player, enemy.getId(), 'k1')
    // 霸王弓命中后拆马
    expect(enemy.getEquippedCard('attackMount')).toBeUndefined()
  })

  it('getAttackRange 使用武器卡实际 range 字段', () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    expect(player.getAttackRange()).toBe(1)
    // 装备虎符 (range 1)
    player.drawCards([makeEquipment('虎符', 'weapon', 1)])
    game.playerEquipCard(player, eid('虎符'))
    expect(player.getAttackRange()).toBe(1)
    // 装备霸王弓 (range 5)
    player.drawCards([makeEquipment('霸王弓', 'weapon', 5, 'club', 1)])
    game.playerEquipCard(player, eid('霸王弓', 'club', 1))
    expect(player.getAttackRange()).toBe(5)
  })

  it('玉如意: 防具名识别', () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    player.drawCards([makeEquipment('玉如意', 'armor', undefined, 'diamond', 2)])
    game.playerEquipCard(player, eid('玉如意', 'diamond', 2))
    expect(player.getArmorName()).toBe('玉如意')
  })

  it('龙鳞刀: 命中后弃对方2张牌代替掉血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      disarmPromptHandler: async () => true,  // 玩家选择弃牌
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      makeEquipment('龙鳞刀', 'weapon', 2, 'heart', 1),
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
    ])
    enemy.drawCards([
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
      { id: 'e2', suit: 'spade', number: 2, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(player, eid('龙鳞刀', 'heart', 1))
    expect(player.getWeaponName()).toBe('龙鳞刀')

    const beforeHp = enemy.getCurrentHp()
    const beforeHand = enemy.getHandSize()
    await game.playerPlayKill(player, enemy.getId(), 'k1')
    // 龙鳞刀: 弃2张牌代替掉血
    expect(enemy.getHandSize()).toBe(beforeHand - 2)
    expect(enemy.getCurrentHp()).toBe(beforeHp)  // 没掉血
  })

  it('龙鳞刀: 玩家选择掉血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      disarmPromptHandler: async () => false,  // 玩家选择掉血
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      makeEquipment('龙鳞刀', 'weapon', 2, 'heart', 1),
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
    ])
    enemy.drawCards([
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(player, eid('龙鳞刀', 'heart', 1))
    const beforeHp = enemy.getCurrentHp()
    const beforeHand = enemy.getHandSize()
    await game.playerPlayKill(player, enemy.getId(), 'k1')
    // 选择掉血 → 弃牌不变, 掉1血
    expect(enemy.getHandSize()).toBe(beforeHand)
    expect(enemy.getCurrentHp()).toBe(beforeHp - 1)
  })

  it('狼牙棒: 最后一张手牌出杀最多3目标', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian', 'xiang-yu'],
      playerActionHandler: async () => null,
      multiTargetHandler: async (_g, _p, candidates) => {
        // 玩家选前2个目标
        return candidates.slice(0, 2).map(c => c.getId())
      },
    })
    const player = game.getPlayer()
    const e1 = game.getPlayerById('han-xin')!
    const e2 = game.getPlayerById('wu-ze-tian')!
    const e3 = game.getPlayerById('xiang-yu')!
    player.drawCards([
      makeEquipment('狼牙棒', 'weapon', 3, 'spade', 3),
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(player, eid('狼牙棒', 'spade', 3))
    expect(player.getWeaponName()).toBe('狼牙棒')
    expect(player.getHandSize()).toBe(1)  // 杀是最后一张

    const hp1 = e1.getCurrentHp(), hp2 = e2.getCurrentHp(), hp3 = e3.getCurrentHp()
    await game.playerPlayKillAuto(player, 'k1')
    // 选2个目标 → 2个敌人各掉1血, 第3个不掉血
    expect(e1.getCurrentHp()).toBe(hp1 - 1)
    expect(e2.getCurrentHp()).toBe(hp2 - 1)
    expect(e3.getCurrentHp()).toBe(hp3)
  })

  it('狼牙棒: 玩家放弃 (返回空数组) → 不出杀', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      multiTargetHandler: async () => [],
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      makeEquipment('狼牙棒', 'weapon', 3, 'spade', 3),
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(player, eid('狼牙棒', 'spade', 3))
    const beforeHp = enemy.getCurrentHp()
    await game.playerPlayKillAuto(player, 'k1')
    // 玩家放弃 → 不出杀
    expect(enemy.getCurrentHp()).toBe(beforeHp)
  })

  it('芦叶枪: 选2张手牌当杀', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      dualCardHandler: async (_g, p) => p.getHand().slice(0, 2).map(c => c.id),
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      makeEquipment('芦叶枪', 'weapon', 3, 'spade', 4),
      { id: 'a1', suit: 'spade', number: 5, type: 'basic', name: '闪' } as any,
      { id: 'a2', suit: 'spade', number: 7, type: 'basic', name: '闪' } as any,
    ])
    game.playerEquipCard(player, eid('芦叶枪', 'spade', 4))
    expect(player.getWeaponName()).toBe('芦叶枪')

    const beforeHp = enemy.getCurrentHp()
    await game.playerUseLuYeQiang(player)
    // 2张手牌当杀 → 命中1次
    expect(enemy.getCurrentHp()).toBe(beforeHp - 1)
  })
})
