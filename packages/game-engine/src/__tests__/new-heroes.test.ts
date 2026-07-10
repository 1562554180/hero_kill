import { describe, it, expect } from 'vitest'
import { Game } from '../core/Game'
import type { HeroInstance, Card } from '@hero-legend/shared-types'

function instance(heroId: string, starLevel: number = 3): HeroInstance {
  return { heroId, level: 1, growthValue: 0, starLevel, treasures: { main: [], sub: [] } }
}

function card(name: string, id: string, suit: any = 'spade', number = 5, type: any = 'basic'): Card {
  return { id, suit, number, type, name } as any
}

describe('妲己 - 媚国 (mei-guo)', () => {
  it('HP<5 时, 攻击者在自己回合主动出杀被阻断', async () => {
    const game = new Game({
      playerHeroId: 'liu-bang', playerInstance: instance('liu-bang', 3),
      allyHeroIds: [], enemyHeroIds: ['da-ji'],
      playerActionHandler: async () => null,
      responseActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const daJi = game.getPlayerById('da-ji')!
    // 让妲己 HP<5
    daJi.takeDamage(2)
    expect(daJi.getCurrentHp()).toBeLessThan(5)
    // 玩家 (当前回合) 主动出杀
    const kill = card('杀', 'k1')
    player.drawCards([kill])
    await game.playerPlayKill(player, 'da-ji', 'k1')
    // 妲己没掉血 (媚国阻断)
    expect(daJi.getCurrentHp()).toBe(daJi.getMaxHp() - 2)  // 只受了之前的2点
  })

  it('HP≥5 时, 媚国不生效', async () => {
    const game = new Game({
      playerHeroId: 'liu-bang', playerInstance: instance('liu-bang', 3),
      allyHeroIds: [], enemyHeroIds: ['da-ji'],
      playerActionHandler: async () => null,
      responseActionHandler: async () => null,
    })
    const player = game.getPlayer()
    const daJi = game.getPlayerById('da-ji')!
    // 妲己满血
    expect(daJi.getCurrentHp()).toBeGreaterThanOrEqual(5)
    const kill = card('杀', 'k1')
    player.drawCards([kill])
    await game.playerPlayKill(player, 'da-ji', 'k1')
    // 杀命中, 妲己掉1血
    expect(daJi.getCurrentHp()).toBe(daJi.getMaxHp() - 1)
  })
})

describe('妲己 - 噬心 (shi-xin)', () => {
  it('玩家受伤后选弃牌发动 → 对来源造成相同伤害', async () => {
    const game = new Game({
      playerHeroId: 'da-ji', playerInstance: instance('da-ji', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
      playerActionHandler: async () => null,
      responseActionHandler: async () => null,
      // 让妲己选噬心发动, 弃 d1
      shiXinTriggerHandler: async (ctx) => {
        return ctx.options.hand[0]?.id ?? ctx.options.equipment[0]?.id ?? null
      },
    })
    const daJi = game.getPlayer()
    const liuBang = game.getPlayerById('liu-bang')!
    // 给妲己一张牌, 让噬心可以弃牌
    daJi.drawCards([card('闪', 'd1', 'heart')])
    const liuBangHpBefore = liuBang.getCurrentHp()
    // 直接用 applyDamage (妲己受1伤 → 噬心触发 → 刘邦受1伤)
    await (game as any).applyDamage(liuBang, daJi, 1)
    expect(liuBang.getCurrentHp()).toBe(liuBangHpBefore - 1)
  })

  it('玩家选不发动 → 不反击', async () => {
    const game = new Game({
      playerHeroId: 'da-ji', playerInstance: instance('da-ji', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
      playerActionHandler: async () => null,
      responseActionHandler: async () => null,
      shiXinTriggerHandler: async () => null,  // 不发动
    })
    const daJi = game.getPlayer()
    const liuBang = game.getPlayerById('liu-bang')!
    const liuBangHpBefore = liuBang.getCurrentHp()
    await (game as any).applyDamage(liuBang, daJi, 1)
    expect(liuBang.getCurrentHp()).toBe(liuBangHpBefore)  // 不变
  })
})

describe('包拯 - 平冤 (ping-yuan)', () => {
  it('受到伤害后摸1张', async () => {
    const game = new Game({
      playerHeroId: 'bao-zheng', playerInstance: instance('bao-zheng', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
      playerActionHandler: async () => null,
      responseActionHandler: async () => null,
    })
    const baoZheng = game.getPlayer()
    const liuBang = game.getPlayerById('liu-bang')!
    const handBefore = baoZheng.getHandSize()
    await (game as any).applyDamage(liuBang, baoZheng, 1)
    expect(baoZheng.getHandSize()).toBe(handBefore + 1)
  })

  it('治疗(药)后摸1张', async () => {
    const game = new Game({
      playerHeroId: 'bao-zheng', playerInstance: instance('bao-zheng', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
      playerActionHandler: async () => null,
    })
    const baoZheng = game.getPlayer()
    baoZheng.takeDamage(2)  // 掉血到满血-2 (takeDamage 不触发平冤)
    // 用药
    baoZheng.drawCards([card('药', 'y1')])
    const handBefore = baoZheng.getHandSize()  // 抽完药之后, 作为基准
    game.playerPlayHeal(baoZheng, 'y1')
    // 用掉1张药(-1) + 平冤摸1张(+1) = 不变
    expect(baoZheng.getHandSize()).toBe(handBefore)
  })
})

describe('包拯 - 神断 (shen-duan)', () => {
  it('出牌阶段弃1张手牌获得1个标记 (上限2)', () => {
    const game = new Game({
      playerHeroId: 'bao-zheng', playerInstance: instance('bao-zheng', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
    })
    const baoZheng = game.getPlayer()
    baoZheng.drawCards([card('杀', 'k1'), card('杀', 'k2'), card('杀', 'k3')])
    expect(game.playerShenDuan(baoZheng, 'k1')).toBe(true)
    expect(baoZheng.getToken('shen-duan')).toBe(1)
    expect(game.playerShenDuan(baoZheng, 'k2')).toBe(true)
    expect(baoZheng.getToken('shen-duan')).toBe(2)
    // 第3次应失败 (上限)
    expect(game.playerShenDuan(baoZheng, 'k3')).toBe(false)
    expect(baoZheng.getToken('shen-duan')).toBe(2)
  })

  it('判定时消耗标记并改花色', async () => {
    const game = new Game({
      playerHeroId: 'bao-zheng', playerInstance: instance('bao-zheng', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
      shenDuanHandler: async () => 'heart',  // 改成红桃
    })
    const baoZheng = game.getPlayer()
    baoZheng.addToken('shen-duan', 1)
    expect(baoZheng.getToken('shen-duan')).toBe(1)
    // 触发判定
    const result = await game.judgeWithSkills(baoZheng, 'test')
    // 包拯会消耗标记并改花色为 heart
    expect(baoZheng.getToken('shen-duan')).toBe(0)
    expect(result.suit).toBe('heart')
  })
})

describe('东方朔 - 智圣 (zhi-sheng)', () => {
  it('场上判定结束后, 判定牌点数<=7 → 东方朔摸1张', async () => {
    const game = new Game({
      playerHeroId: 'dong-fang-suo', playerInstance: instance('dong-fang-suo', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
    })
    const dfs = game.getPlayer()
    const handBefore = dfs.getHandSize()
    // 注入一张点数3的牌到抽牌堆顶
    // 通过修改 deck 状态不可行, 改为直接调用 judge
    // 先清空手牌防止干扰
    // 这里我们mock judge返回 low number 较复杂, 跳过直接调用 judge
    // 改为: 用 stack trick — 改 deck 的 force suit? 实际上做不到强制 number
    // 简化: 调用一个低 number 的判定
    // 用 helper 注入牌
    const testCard = card('桃', 'judge1', 'heart', 3)
    ;(game as any).cardDeck.draw = () => [testCard]  // 强制返回这张牌
    await game.judge(dfs, 'test')
    expect(dfs.getHandSize()).toBe(handBefore + 1)
  })
})

describe('东方朔 - 词赋 (ci-fu)', () => {
  it('回合开始阶段玩家发动 → 黑给队友', async () => {
    const game = new Game({
      playerHeroId: 'dong-fang-suo', playerInstance: instance('dong-fang-suo', 3),
      allyHeroIds: ['guan-yu'], enemyHeroIds: ['liu-bang'],
      // ciFuHandler: 黑色 → 给关羽
      ciFuHandler: async (ctx) => {
        if (ctx.isBlack) return { kind: 'give', targetId: 'guan-yu' }
        return { kind: 'place', where: 'top' }
      },
    })
    const dfs = game.getPlayer()
    const testCard = card('桃', 'judge1', 'spade', 5)  // 黑桃
    ;(game as any).cardDeck.draw = () => [testCard]
    const guanYu = game.getPlayerById('guan-yu')!
    const guanYuHandBefore = guanYu.getHandSize()
    await (game as any).promptCiFu(dfs)
    // 关羽应该得到那张牌
    expect(guanYu.getHandSize()).toBe(guanYuHandBefore + 1)
  })
})

describe('张三丰 - 布道 (bu-dao)', () => {
  it('摸牌阶段摸3张, 给1张给指定目标', async () => {
    const game = new Game({
      playerHeroId: 'zhang-san-feng', playerInstance: instance('zhang-san-feng', 3),
      allyHeroIds: ['guan-yu'], enemyHeroIds: ['liu-bang'],
      playerActionHandler: async () => null,  // 跳过出牌阶段 (避免自动 AI 玩杀)
      buDao3GiveHandler: async (ctx) => {
        // 给关羽第一张
        return { targetId: 'guan-yu', cardId: ctx.drawn[0].id }
      },
    })
    const zsf = game.getPlayer()
    const guanYu = game.getPlayerById('guan-yu')!
    const handBefore = zsf.getHandSize()
    const guanYuHandBefore = guanYu.getHandSize()
    await game.executeTurn()  // 触发摸牌
    // 玩家摸3张, 给1张 → 净增 2张
    expect(zsf.getHandSize()).toBe(handBefore + 2)
    expect(guanYu.getHandSize()).toBe(guanYuHandBefore + 1)
  })
})

describe('张三丰 - 太极 (tai-ji)', () => {
  it('打出闪后, 可立即对攻击范围内角色出杀', async () => {
    const game = new Game({
      playerHeroId: 'zhang-san-feng', playerInstance: instance('zhang-san-feng', 3),
      allyHeroIds: [], enemyHeroIds: ['liu-bang'],
      // 张三丰出闪 → 触发太极反击
      taiJiHandler: async (ctx) => {
        return { cardId: ctx.killableCards[0].id, targetId: ctx.candidateIds[0] }
      },
      responseActionHandler: async (ctx) => {
        // 张三丰用 d1 闪
        if (ctx.responseType === 'dodge' && ctx.playerId === 'zhang-san-feng') return 'd1'
        return null
      },
    })
    const zsf = game.getPlayer()
    const liuBang = game.getPlayerById('liu-bang')!
    // 张三丰手中有 杀 + 闪
    zsf.drawCards([card('杀', 'k1'), card('闪', 'd1', 'heart')])
    // 刘邦手中有 杀
    liuBang.drawCards([card('杀', 'k2')])
    const liuBangHpBefore = liuBang.getCurrentHp()
    // 刘邦攻击张三丰 → 张三丰闪 → 太极反击出杀
    await game.playerPlayKill(liuBang, 'zhang-san-feng', 'k2')
    // 刘邦应该受1伤 (太极反击)
    expect(liuBang.getCurrentHp()).toBeLessThan(liuBangHpBefore)
  })
})