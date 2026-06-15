import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

const baseInstance: HeroInstance = {
  heroId: 'yang-yan-zhao', level: 1, growthValue: 0, starLevel: 5, treasures: { main: [], sub: [] },
}

function card(name: string, id: string, suit: any = 'spade', number = 5, type: any = 'basic'): Card {
  return { id, suit, number, type, name } as any
}

function makeInstanceWithTreasure(main: any[]): HeroInstance {
  return { ...baseInstance, treasures: { main, sub: [] } }
}

describe('主印宝具: 实现验证', () => {
  describe('妙计 (miao-ji)', () => {
    it('使用锦囊时摸1张', async () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'miao-ji' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      player.drawCards([card('无中生有', 'wzy1', 'heart', 3, 'scheme')])
      const before = player.getHandSize()
      await game.playerPlayScheme(player, 'wzy1')
      // 无中生有摸2张 + 妙计摸1张
      expect(player.getHandSize()).toBe(before - 1 + 3)
    })
  })

  describe('疗伤 (liao-shang)', () => {
    it('弃1张手牌令1名角色回复1血', async () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'liao-shang' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      enemy.takeDamage(1)  // 敌人掉1血
      const enemyHpBefore = enemy.getCurrentHp()
      player.drawCards([card('杀', 'k1')])
      game.playerLiaoShang(player, 'k1', 'han-xin')
      expect(player.getHandSize()).toBe(0)  // 弃了1张
      expect(enemy.getCurrentHp()).toBe(enemyHpBefore + 1)  // 敌人回了1血
    })
  })

  describe('起义 (qi-yi)', () => {
    it('从2名其他角色各拿1张手牌', () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'qi-yi' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      const e1 = game.getPlayerById('han-xin')!
      const e2 = game.getPlayerById('wu-ze-tian')!
      e1.drawCards([card('杀', 'e1c1')])
      e2.drawCards([card('杀', 'e2c1')])
      game.playerQiYi(player, ['han-xin', 'wu-ze-tian'])
      expect(e1.getHandSize()).toBe(0)
      expect(e2.getHandSize()).toBe(0)
      // 玩家手牌增加2张
      expect(player.getHandSize()).toBe(2)
    })
  })

  describe('绝击 (jue-ji)', () => {
    it('受1伤, 令攻击范围内1名敌人受1伤', () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'jue-ji' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      const playerHpBefore = player.getCurrentHp()
      const enemyHpBefore = enemy.getCurrentHp()
      game.playerJueJi(player, null, 'han-xin')
      expect(player.getCurrentHp()).toBe(playerHpBefore - 1)
      expect(enemy.getCurrentHp()).toBe(enemyHpBefore - 1)
    })
  })

  describe('烽火 (feng-huo)', () => {
    it('弃1张装备视为使用烽火狼烟', async () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'feng-huo' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      // 给玩家装备武器, 敌人无杀
      const weapon = { id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '诸葛弩', slot: 'weapon', range: 1 } as any
      player.drawCards([weapon])
      game.playerEquipCard(player, 'w1')  // 装备后手牌没了
      // 重新拿一张装备
      const w2 = { id: 'w2', suit: 'spade', number: 2, type: 'equipment', name: '雌雄双股剑', slot: 'weapon', range: 2 } as any
      player.drawCards([w2])
      const enemyHpBefore = enemy.getCurrentHp()
      await game.playerFengHuo(player, 'w2')
      // 敌人没杀 → 掉1血
      expect(enemy.getCurrentHp()).toBe(enemyHpBefore - 1)
    })

    it('烽火+妙计: 视为锦囊额外摸1张', async () => {
      const instance = makeInstanceWithTreasure([
        { skill: { id: 'feng-huo' }, triggerRate: 1 },
        { skill: { id: 'miao-ji' }, triggerRate: 1 },
      ])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      // 装备
      const weapon = { id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '诸葛弩', slot: 'weapon', range: 1 } as any
      player.drawCards([weapon])
      game.playerEquipCard(player, 'w1')
      const w2 = { id: 'w2', suit: 'spade', number: 2, type: 'equipment', name: '雌雄双股剑', slot: 'weapon', range: 2 } as any
      player.drawCards([w2])
      // 给手牌补足以便观察摸牌
      player.drawCards([card('杀', 'k1', 'spade', 7), card('杀', 'k2', 'spade', 8)])
      const before = player.getHandSize()
      await game.playerFengHuo(player, 'w2')
      // 烽火弃1装备 -1, 妙计摸1 +1, 净0
      expect(player.getHandSize()).toBe(before)
    })

    it('烽火+妙计(主印真实id): 视为锦囊额外摸1张', async () => {
      const instance = makeInstanceWithTreasure([
        { skill: { id: 'treasure-feng-huo' }, triggerRate: 1 },
        { skill: { id: 'treasure-miao-ji' }, triggerRate: 1 },
      ])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      const weapon = { id: 'w1', suit: 'spade', number: 1, type: 'equipment', name: '诸葛弩', slot: 'weapon', range: 1 } as any
      player.drawCards([weapon])
      game.playerEquipCard(player, 'w1')
      const w2 = { id: 'w2', suit: 'spade', number: 2, type: 'equipment', name: '雌雄双股剑', slot: 'weapon', range: 2 } as any
      player.drawCards([w2])
      player.drawCards([card('杀', 'k1', 'spade', 7), card('杀', 'k2', 'spade', 8)])
      const before = player.getHandSize()
      await game.playerFengHuo(player, 'w2')
      expect(player.getHandSize()).toBe(before)
    })

    it('烽火弃乾坤袋: 额外摸1张(装备丢失效果)', async () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'feng-huo' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      // 装备乾坤袋
      const qkd = { id: 'qkd1', suit: 'heart', number: 3, type: 'equipment', name: '乾坤袋', slot: 'armor' } as any
      player.drawCards([qkd])
      game.playerEquipCard(player, 'qkd1')
      // 手牌加2张观察净变化
      player.drawCards([card('杀', 'k1', 'spade', 7), card('杀', 'k2', 'spade', 8)])
      const before = player.getHandSize()
      await game.playerFengHuo(player, 'qkd1')
      // 乾坤袋在装备区(不占手牌), 弃后乾坤袋装备丢失 → 摸1张
      expect(player.getHandSize()).toBe(before + 1)
    })
  })

  describe('侠胆 (xia-dan) 拼点', () => {
    // 测试用: 玩家(shang-yang 无天狼)自动选手中第一张牌
    function makeGameWithPlayerPick(player: any, pickCardId: string, opts?: { enemyHeroIds?: string[], allyHeroIds?: string[] }) {
      return new Game({
        playerHeroId: 'shang-yang', playerInstance: makeInstanceWithTreasure([{ skill: { id: 'xia-dan' }, triggerRate: 1 }]),
        allyHeroIds: opts?.allyHeroIds ?? [],
        enemyHeroIds: opts?.enemyHeroIds ?? ['han-xin'],
        playerActionHandler: async () => null,
        xiaDanPlayerCardHandler: async (_g, p) => {
          // 玩家选指定的牌
          const target = p.getHand().find((c: any) => c.id === pickCardId)
          return target?.id ?? p.getHand()[0]?.id ?? null
        },
      })
    }

    it('赢拼点 (13 vs 2): 玩家本回合杀次数=2', async () => {
      const game = makeGameWithPlayerPick(null, 'p1')
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 13), card('杀', 'p2', 'heart', 7)])
      enemy.drawCards([card('杀', 'e1', 'spade', 2)])
      await game.playerXiaDan(player, 'han-xin')
      // 杀次数上限被设为 2
      expect((game as any).killsMaxThisTurn).toBe(2)
      expect((game as any).xiaDanWinTargetsPerKill.get('shang-yang')).toBe(2)
      expect(game.canPlayKill).toBe(true)
    })

    it('输拼点 (2 vs 13): 本回合不能出杀', async () => {
      const game = makeGameWithPlayerPick(null, 'p1')
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 2)])
      enemy.drawCards([card('杀', 'e1', 'spade', 13)])
      await game.playerXiaDan(player, 'han-xin')
      expect((game as any).xiaDanLossThisTurn.has('shang-yang')).toBe(true)
      // 杀次数仍为1(默认)
      expect((game as any).killsMaxThisTurn).toBe(1)
    })

    it('平拼点 (7 vs 7): 玩家点数 >= 目标点数 仍算胜 (新规则)', async () => {
      const game = makeGameWithPlayerPick(null, 'p1')
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 7)])
      enemy.drawCards([card('杀', 'e1', 'heart', 7)])
      await game.playerXiaDan(player, 'han-xin')
      // 新规则: >= 即胜
      expect((game as any).killsMaxThisTurn).toBe(2)
      expect((game as any).xiaDanLossThisTurn.has('shang-yang')).toBe(false)
    })

    it('双方同时选牌 (parallel pick)', async () => {
      // 双方不会看到对方出了什么牌, 选牌是并行的
      const callOrder: string[] = []
      const game = new Game({
        playerHeroId: 'yang-yan-zhao',
        playerInstance: makeInstanceWithTreasure([{ skill: { id: 'xia-dan' }, triggerRate: 1 }]),
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
        pinDianHandler: async (_g, _target, _against) => {
          callOrder.push('target-pick')
          return 'e1'
        },
        xiaDanPlayerCardHandler: async (_g, p) => {
          callOrder.push('player-pick')
          return p.getHand().find(c => c.id === 'p1')?.id ?? null
        },
      })
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 13)])
      enemy.drawCards([card('杀', 'e1', 'spade', 2)])
      await game.playerXiaDan(player, 'han-xin')
      // 双方都被调用过
      expect(callOrder).toContain('target-pick')
      expect(callOrder).toContain('player-pick')
    })

    it('玩家取消拼点 (handler返回null): 不消耗手牌, 技能已用', async () => {
      const game = new Game({
        playerHeroId: 'shang-yang',
        playerInstance: makeInstanceWithTreasure([{ skill: { id: 'xia-dan' }, triggerRate: 1 }]),
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
        pinDianHandler: async (_g, _target) => 'e1',
        xiaDanPlayerCardHandler: async () => null,  // 玩家取消
      })
      const player = game.getPlayer()
      const enemy = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 13), card('杀', 'p2', 'heart', 9)])
      enemy.drawCards([card('杀', 'e1', 'spade', 2)])
      const handBefore = player.getHandSize()
      await game.playerXiaDan(player, 'han-xin')
      // 玩家的p1没有被消耗
      expect(player.getHandSize()).toBe(handBefore)
      // 也没有胜出
      expect((game as any).xiaDanWinKillsLeft.has('shang-yang')).toBe(false)
      // 技能仍记为已用, 不能再次发动
      expect((game as any).xiaDanUsedThisTurn.has('shang-yang')).toBe(true)
    })

    it('目标无手牌时跳过 (不消耗己方手牌)', async () => {
      const game = new Game({
        playerHeroId: 'yang-yan-zhao',
        playerInstance: makeInstanceWithTreasure([{ skill: { id: 'xia-dan' }, triggerRate: 1 }]),
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const player = game.getPlayer()
      player.drawCards([card('杀', 'p1', 'spade', 13)])
      const handBefore = player.getHandSize()
      await game.playerXiaDan(player, 'han-xin')
      // 自己的p1没被消耗
      expect(player.getHandSize()).toBe(handBefore)
    })

    it('多杀: playerPlayKillMulti 一次对2目标, 只消耗1次杀次数', async () => {
      const game = makeGameWithPlayerPick(null, 'p1', { enemyHeroIds: ['han-xin', 'xiang-yu'] })
      const player = game.getPlayer()
      const hanXin = game.getPlayerById('han-xin')!
      const xiangYu = game.getPlayerById('xiang-yu')!
      player.drawCards([card('杀', 'p1', 'spade', 13), card('杀', 'p2', 'heart', 9)])
      hanXin.drawCards([card('杀', 'e1', 'spade', 2)])
      await game.playerXiaDan(player, 'han-xin')
      expect((game as any).killsMaxThisTurn).toBe(2)
      expect((game as any).xiaDanWinTargetsPerKill.get('shang-yang')).toBe(2)
      const hp1Before = hanXin.getCurrentHp()
      const hp2Before = xiangYu.getCurrentHp()
      await game.playerPlayKillMulti(player, 'p2', ['han-xin', 'xiang-yu'])
      expect(hanXin.getCurrentHp()).toBe(hp1Before - 1)
      expect(xiangYu.getCurrentHp()).toBe(hp2Before - 1)
      // 多杀只算1次
      expect((game as any).killsUsedThisTurn).toBe(1)
    })

    it('多杀: 第2次再出一张单杀消耗剩余的杀次数', async () => {
      const game = makeGameWithPlayerPick(null, 'p1', { enemyHeroIds: ['han-xin', 'xiang-yu'] })
      const player = game.getPlayer()
      const hanXin = game.getPlayerById('han-xin')!
      const xiangYu = game.getPlayerById('xiang-yu')!
      player.drawCards([card('杀', 'p1', 'spade', 13), card('杀', 'p2', 'heart', 9), card('杀', 'p3', 'club', 8)])
      hanXin.drawCards([card('杀', 'e1', 'spade', 2)])
      xiangYu.drawCards([card('杀', 'e2', 'spade', 2)])
      await game.playerXiaDan(player, 'han-xin')
      await game.playerPlayKillMulti(player, 'p2', ['han-xin', 'xiang-yu'])
      expect((game as any).killsUsedThisTurn).toBe(1)
      await game.playerPlayKill(player, 'han-xin', 'p3')
      // 第2次单杀后已用满2次
      expect((game as any).killsUsedThisTurn).toBe(2)
      expect(game.canPlayKill).toBe(false)
    })

    it('多杀: 不在侠胆胜出状态时playerPlayKillMulti 不会执行', async () => {
      const game = makeGameWithPlayerPick(null, 'p1', { enemyHeroIds: ['han-xin', 'xiang-yu'] })
      const player = game.getPlayer()
      const hanXin = game.getPlayerById('han-xin')!
      const xiangYu = game.getPlayerById('xiang-yu')!
      player.drawCards([card('杀', 'p1', 'heart', 9)])
      const hp1Before = hanXin.getCurrentHp()
      const hp2Before = xiangYu.getCurrentHp()
      await game.playerPlayKillMulti(player, 'p1', ['han-xin', 'xiang-yu'])
      expect(hanXin.getCurrentHp()).toBe(hp1Before)
      expect(xiangYu.getCurrentHp()).toBe(hp2Before)
    })

    it('拼点胜出后, 玩家出单杀消耗杀次数', async () => {
      const game = makeGameWithPlayerPick(null, 'p1')
      const player = game.getPlayer()
      const hanXin = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 13), card('杀', 'p2', 'heart', 9), card('杀', 'p3', 'club', 8)])
      hanXin.drawCards([card('杀', 'e1', 'spade', 2)])
      await game.playerXiaDan(player, 'han-xin')
      await game.playerPlayKill(player, 'han-xin', 'p2')
      expect((game as any).killsUsedThisTurn).toBe(1)
      // 杀次数上限是2, 已用1次, 还能再出1次
      expect(game.canPlayKill).toBe(true)
    })

    it('天狼 仍可无限出杀 (killsMaxThisTurn = Infinity)', async () => {
      // yang-yan-zhao 天生带天狼, 配合 xia-dan 主印: 无限杀 + 多目标
      const instance = makeInstanceWithTreasure([{ skill: { id: 'xia-dan', name: '侠胆', type: 'passive', description: '拼点胜出: 多杀' }, triggerRate: 1 } as any])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin', 'xiang-yu'],
        playerActionHandler: async () => null,
        xiaDanPlayerCardHandler: async (_g, p) => p.getHand().find(c => c.id === 'p1')?.id ?? null,
      })
      const player = game.getPlayer()
      const hanXin = game.getPlayerById('han-xin')!
      player.drawCards([card('杀', 'p1', 'spade', 13), card('杀', 'p2', 'heart', 9), card('杀', 'p3', 'club', 8)])
      hanXin.drawCards([card('杀', 'e1', 'spade', 2)])
      await game.playerXiaDan(player, 'han-xin')
      // 天狼: 杀上限 = Infinity
      expect((game as any).killsMaxThisTurn).toBe(Infinity)
      // 玩家可以出无限杀
      expect(game.canPlayKill).toBe(true)
      // 侠胆胜出: 可以一次杀多个目标
      expect((game as any).xiaDanWinTargetsPerKill.get('yang-yan-zhao')).toBe(2)
    })
  })

  describe('蝶魂 (die-hun)', () => {
    it('烽火狼烟: 蝶魂目标跳过结算并摸1张', async () => {
      const instance = makeInstanceWithTreasure([{ skill: { id: 'die-hun' }, triggerRate: 1 }])
      const game = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: instance,
        allyHeroIds: [], enemyHeroIds: ['han-xin', 'wu-ze-tian'],
        playerActionHandler: async () => null,
      })
      // 玩家给 han-xin 蝶魂 (敌人han-xin)
      const enemyInstance = { heroId: 'han-xin', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [{ skill: { id: 'die-hun' }, triggerRate: 1 }], sub: [] } }
      // 重新构造
      const game2 = new Game({
        playerHeroId: 'yang-yan-zhao', playerInstance: baseInstance,
        allyHeroIds: [], enemyHeroIds: ['han-xin'],
        playerActionHandler: async () => null,
      })
      const hanXin = game2.getPlayerById('han-xin') as any
      hanXin.hero.instance.treasures.main = [{ skill: { id: 'die-hun' }, triggerRate: 1 }]
      // 但更简单: 直接调用checkDieHun
      const player2 = game2.getPlayer()
      const hanXin2 = game2.getPlayerById('han-xin')!
      const handBefore = hanXin2.getHandSize()
      const result = (game2 as any).checkDieHun(hanXin2, '烽火狼烟')
      expect(result).toBe(true)
      expect(hanXin2.getHandSize()).toBe(handBefore + 1)
    })
  })
})
