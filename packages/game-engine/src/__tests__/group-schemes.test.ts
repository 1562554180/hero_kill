import { describe, it, expect, vi } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'shang-yang', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] },
}

function scheme(name: string, id: string): Card {
  return { id, suit: 'spade', number: 5, type: 'scheme', name } as any
}

describe('五谷丰登', () => {
  it('存活3人 → 翻3张, 每人选1张', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
      playerActionHandler: async () => null,
      wuguPickHandler: async (_g, _p, candidates) => candidates[0].id,
    })
    const player = game.getPlayer()
    player.drawCards([scheme('五谷丰登', 'wg1')])
    const beforeHand = player.getHandSize()
    await game.playerPlayScheme(player, 'wg1')
    // 玩家+2个敌人 = 3人, 每人+1张
    expect(player.getHandSize()).toBe(beforeHand - 1 + 1)  // 用了1张, 拿回1张
    expect(game.getPlayerById('han-xin')!.getHandSize()).toBe(1)
    expect(game.getPlayerById('wu-ze-tian')!.getHandSize()).toBe(1)
  })

  it('使用者在选牌顺序首位', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      wuguPickHandler: async (_g, p, candidates) => {
        // 玩家总是选第一张
        return candidates[0].id
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('五谷丰登', 'wg1')])
    await game.playerPlayScheme(player, 'wg1')
    // 玩家先选
    expect(player.getHandSize()).toBe(1)  // 用了1张+1张
    expect(enemy.getHandSize()).toBe(1)  // 选到1张
  })
})

describe('万箭齐发', () => {
  it('所有其他玩家需出闪，否则掉1血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const e1 = game.getPlayerById('han-xin')!
    const e2 = game.getPlayerById('wu-ze-tian')!
    player.drawCards([scheme('万箭齐发', 'wj1')])
    // 敌人都有闪
    e1.drawCards([{ id: 'd1', suit: 'heart', number: 5, type: 'basic', name: '闪' } as any])
    e2.drawCards([{ id: 'd2', suit: 'heart', number: 7, type: 'basic', name: '闪' } as any])
    const before1 = e1.getCurrentHp()
    const before2 = e2.getCurrentHp()
    await game.playerPlayScheme(player, 'wj1')
    // 都有闪 → 不掉血
    expect(e1.getCurrentHp()).toBe(before1)
    expect(e2.getCurrentHp()).toBe(before2)
  })

  it('敌人无闪 → 掉1血', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('万箭齐发', 'wj1')])
    const before = enemy.getCurrentHp()
    await game.playerPlayScheme(player, 'wj1')
    expect(enemy.getCurrentHp()).toBe(before - 1)
  })

  it('群锦囊: 使用阶段不能被无懈可击打断 (响应阶段才能免于响应)', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, _p, type) => type === 'nullify' ? 'wx1' : null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      scheme('万箭齐发', 'wj1'),
      { id: 'wx1', suit: 'diamond', number: 7, type: 'scheme', name: '无懈可击' } as any,
    ])
    enemy.drawCards([
      { id: 'd1', suit: 'heart', number: 5, type: 'basic', name: '闪' } as any,
    ])
    const before = enemy.getCurrentHp()
    await game.playerPlayScheme(player, 'wj1')
    // 群体锦囊使用阶段不能被无懈可击打断 → 敌人出闪 → 不掉血
    expect(enemy.getCurrentHp()).toBe(before)
  })

  it('群锦囊响应: 目标无闪但有无懈可击 → 无懈可击免于响应 (不掉血)', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      responseActionHandler: async (_g, p, type) => {
        // 玩家(本场景是敌方AI)响应时优先用闪, 否则用无懈可击
        if (type === 'dodge') {
          const wx = p.getHand().find(c => c.name === '无懈可击')
          if (wx) return wx.id
        }
        return null
      },
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('万箭齐发', 'wj1')])
    enemy.drawCards([
      { id: 'wx1', suit: 'diamond', number: 7, type: 'scheme', name: '无懈可击' } as any,
    ])
    const before = enemy.getCurrentHp()
    await game.playerPlayScheme(player, 'wj1')
    // 敌人用无懈可击免于响应 → 不掉血
    expect(enemy.getCurrentHp()).toBe(before)
  })
})

describe('借刀杀人', () => {
  it('有武器玩家不出杀 → 武器归使用者', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
      playerActionHandler: async () => null,
      jieDaoTargetHandler: async (_g, _p, holders) => holders[0].getId(),  // 选han-xin
      jieDaoAttackTargetHandler: async (_g, _p, _b, candidates) => candidates[0].getId(),  // 攻击wu-ze-tian
    })
    const player = game.getPlayer()
    const borrower = game.getPlayerById('han-xin')!
    player.drawCards([scheme('借刀杀人', 'jd1')])
    // han-xin装备武器
    borrower.drawCards([{
      id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '虎符', slot: 'weapon', range: 1, description: ''
    } as any])
    game.playerEquipCard(borrower, 'w1')
    // 玩家不能借刀到自己, han-xin攻击wu-ze-tian
    const beforeBorrowerHand = borrower.getHandSize()
    const beforePlayerHand = player.getHandSize()
    await game.playerPlayScheme(player, 'jd1')
    // jd1被消耗, 武器归玩家 → 净0张变化
    expect(player.getHandSize()).toBe(beforePlayerHand)  // -1(jd1) +1(武器) = 0净变化
    expect(borrower.getHandSize()).toBe(beforeBorrowerHand)  // 武器从装备区转走, 手牌不变
    expect(borrower.getEquippedCard('weapon')).toBeUndefined()
  })

  it('有武器玩家出杀成功 → 杀进入弃牌堆', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
      playerActionHandler: async () => null,
      jieDaoTargetHandler: async (_g, _p, holders) => holders[0].getId(),
      jieDaoAttackTargetHandler: async (_g, _p, _b, candidates) => candidates.find(c => c.getId() === 'wu-ze-tian')!.getId(),
    })
    const player = game.getPlayer()
    const borrower = game.getPlayerById('han-xin')!
    const attackTarget = game.getPlayerById('wu-ze-tian')!
    player.drawCards([scheme('借刀杀人', 'jd1')])
    borrower.drawCards([
      { id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '虎符', slot: 'weapon', range: 1, description: '' } as any,
      { id: 'k1', suit: 'heart', number: 5, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(borrower, 'w1')
    // 攻击目标无闪
    const beforeHp = attackTarget.getCurrentHp()
    await game.playerPlayScheme(player, 'jd1')
    // borrower出杀 → wu-ze-tian 掉1血
    expect(attackTarget.getCurrentHp()).toBe(beforeHp - 1)
    // borrower仍然有武器
    expect(borrower.getEquippedCard('weapon')).toBeDefined()
  })
})

describe('探囊取物', () => {
  it('选目标手牌', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      tanNangTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      tanNangPickHandler: async (_g, _p, _t, options) => options.hand[0].id,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('探囊取物', 'tn1')])
    enemy.drawCards([
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
      { id: 'e2', suit: 'spade', number: 2, type: 'basic', name: '杀' } as any,
    ])
    const before = player.getHandSize()
    await game.playerPlayScheme(player, 'tn1')
    expect(player.getHandSize()).toBe(before)  // -1 +1
    expect(enemy.getHandSize()).toBe(1)
  })

  it('选目标装备', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      tanNangTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      tanNangPickHandler: async (_g, _p, _t, options) => options.equipment[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('探囊取物', 'tn1')])
    enemy.drawCards([
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
      { id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '虎符', slot: 'weapon', range: 1, description: '' } as any,
    ])
    game.playerEquipCard(enemy, 'w1')
    await game.playerPlayScheme(player, 'tn1')
    // 拿走了武器
    expect(enemy.getEquippedCard('weapon')).toBeUndefined()
  })

  it('距离限制: 敌人前后都有防御马且玩家无进攻马 → 无法使用', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([scheme('探囊取物', 'tn1')])
    // 敌人装防御马
    enemy.drawCards([
      { id: 'dm', suit: 'heart', number: 5, type: 'equipment', name: '防御马', slot: 'defenseMount', description: '' } as any,
    ])
    game.playerEquipCard(enemy, 'dm')
    expect(game.canTanNang(player, enemy)).toBe(false)
    await game.playerPlayScheme(player, 'tn1')
    // 拿不到牌, 探囊取物仍然被弃(已打出)
    expect(enemy.getHandSize()).toBe(0)
  })

  it('玩家装进攻马 + 敌人装防御马 → 距离=1 可使用', async () => {
    const game = new Game({
      playerHeroId: 'shang-yang', playerInstance: baseInstance,
      allyHeroIds: [], enemyHeroIds: ['han-xin'],
      playerActionHandler: async () => null,
      tanNangTargetHandler: async (_g, _p, candidates) => candidates[0].getId(),
      tanNangPickHandler: async (_g, _p, _t, options) => options.hand[0]?.id ?? null,
    })
    const player = game.getPlayer()
    const enemy = game.getPlayerById('han-xin')!
    player.drawCards([
      scheme('探囊取物', 'tn1'),
      { id: 'am', suit: 'diamond', number: 5, type: 'equipment', name: '进攻马', slot: 'attackMount', description: '' } as any,
    ])
    enemy.drawCards([
      { id: 'dm', suit: 'heart', number: 5, type: 'equipment', name: '防御马', slot: 'defenseMount', description: '' } as any,
      { id: 'e1', suit: 'spade', number: 1, type: 'basic', name: '杀' } as any,
    ])
    game.playerEquipCard(player, 'am')
    game.playerEquipCard(enemy, 'dm')
    expect(game.canTanNang(player, enemy)).toBe(true)
    await game.playerPlayScheme(player, 'tn1')
    // 拿走了1张
    expect(enemy.getHandSize()).toBe(0)
  })
})
