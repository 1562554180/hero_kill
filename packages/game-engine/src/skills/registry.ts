import type { Skill } from '@hero-legend/shared-types'
import { SkillExecutor } from './SkillExecutor.js'
import type { SkillContext, SkillEffect } from './SkillExecutor.js'

// ============================================================
// 被动技能 - 受伤触发
// ============================================================

// 舍身(虞姬)：受到伤害时摸两张牌
class SheShenSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && ctx.player.isAlive()
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 2, reason: '舍身' } }]
  }
}

// 奸雄(曹操)：受到伤害时获得伤害来源一张手牌
class JianXiongSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && !!ctx.target
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'stealCard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { count: 1, reason: '奸雄' } }]
  }
}

// 复仇(李逵)：受到伤害后对伤害来源造成1点伤害
class FuChouSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && !!ctx.target && ctx.target.isAlive()
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'damage', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { amount: 1, reason: '复仇' } }]
  }
}

// 集权(嬴政)：受到伤害时获得造成伤害的牌
class JiTianSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && !!ctx.data?.cardId
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '集权', specificCardId: ctx.data!.cardId } }]
  }
}

// 法家(商鞅)：造成伤害后获得对方一张手牌
class FaJiaSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:deal' && !!ctx.target && ctx.target.getHandSize() > 0
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'stealCard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { count: 1, reason: '法家' } }]
  }
}

// 反击(秦琼)：受到杀的伤害时，可对伤害来源出一张杀
class FanJiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && !!ctx.target && ctx.target.isAlive()
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'damage', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { amount: 1, reason: '反击' } }]
  }
}

// 曼舞(李师师)：受到伤害时弃一张牌，转移伤害给另一角色
class ManWuSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:receive' && ctx.player.getHandSize() > 0 && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'preventDamage', sourceHeroId: ctx.player.getId(), data: { reason: '曼舞' } }]
  }
}

// ============================================================
// 被动技能 - 出牌触发
// ============================================================

// 霸王(项羽)：出杀时对方需出两张闪
class BaWangSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardName === '杀'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '霸王', requireDoubleDodge: true } }]
  }
}

// 强略(朱元璋)：使用最后一张手牌时摸一张牌
class QiangLueSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.player.getHandSize() === 0
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '强略' } }]
  }
}

// 武圣(关羽)：红色手牌当杀使用
class WuShengSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardName === '杀'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'grantExtraAction', sourceHeroId: ctx.player.getId(), data: { reason: '武圣', canUseRedAsKill: true } }]
  }
}

// 妙计(诸葛亮)：使用锦囊牌时摸一张牌
class MiaoJiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardType === 'scheme'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '妙计' } }]
  }
}

// 刺客(荆轲)：出杀时判定，红色则伤害+1
class CiKeSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardName === '杀'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '刺客', judgeBonus: 1 } }]
  }
}

// 神探(狄仁杰)：任意手牌当无懈可击使用
class ShenTanSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.needDodge === true
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'preventDamage', sourceHeroId: ctx.player.getId(), data: { reason: '神探', anyCardAsDodge: true } }]
  }
}

// 捍北(杨延昭)：每回合可出两次杀
class HanBeiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardName === '杀'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'grantExtraAction', sourceHeroId: ctx.player.getId(), data: { reason: '捍北', extraKillPerTurn: 1 } }]
  }
}

// 武穆(岳飞)：杀当闪、闪当杀
class WuMuSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && (ctx.data?.needKill === true || ctx.data?.needDodge === true)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'grantExtraAction', sourceHeroId: ctx.player.getId(), data: { reason: '武穆', killAsDodge: true, dodgeAsKill: true } }]
  }
}

// 征服(铁木真)：对距离1的角色出杀时对方不能用闪
class ZhengFuSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardName === '杀' && ctx.data?.distance === 1
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '征服', noDodge: true } }]
  }
}

// 三板斧(程咬金)：出杀被闪后可再出一张杀
class SanBanFuSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:prevent'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'grantExtraAction', sourceHeroId: ctx.player.getId(), data: { reason: '三板斧', extraKill: true } }]
  }
}

// 兵仙(韩信)：摸牌阶段额外摸一张
class BingXianSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:start' && ctx.data?.phase === 'draw'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '兵仙' } }]
  }
}

// 洞察(诸葛亮)：不能成为黑色锦囊牌的目标
class DongChaSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && ctx.data?.cardType === 'scheme' && ctx.data?.isTarget === true
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'preventDamage', sourceHeroId: ctx.player.getId(), data: { reason: '洞察', blockBlackScheme: true } }]
  }
}

// 拒马(萧太后)：无视目标坐骑效果
class JuMaSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'card:play' && !!ctx.target
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '拒马', ignoreMount: true } }]
  }
}

// 鬼面(兰陵王)：造成伤害后本回合可无限对其出杀
class GuiMianSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:deal' && !!ctx.target
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'grantExtraAction', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target?.getId(), data: { reason: '鬼面', unlimitedKillOnTarget: true } }]
  }
}

// 南蛮(孟获)：受你杀伤害的目标跳过摸牌阶段
class NanManSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:deal' && !!ctx.target
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target?.getId(), data: { reason: '南蛮', skipDrawPhase: true } }]
  }
}

// 投机(吴三桂)：场上角色<5防御加成，≥5攻击加成
class TouJiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean { return true }
  execute(ctx: SkillContext): SkillEffect[] {
    const alive = ctx.game?.getAlivePlayers()?.length ?? 0
    if (alive < 5) {
      return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '投机', defenseBonus: true } }]
    }
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '投机', attackBonus: 1 } }]
  }
}

// 浴血(兰陵王)：造成伤害时加标记，回合结束3+标记时目标流失1体力
class YuXueSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'turn:end'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'damage', sourceHeroId: ctx.player.getId(), data: { amount: 1, reason: '浴血', aoeMarked: true } }]
  }
}

// ============================================================
// 主动技能 - 出牌阶段使用
// ============================================================

// 驭将(刘邦)：弃一张牌摸两张
class ZhiHuiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() > 0 && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [
      { type: 'discard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '驭将' } },
      { type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 2, reason: '驭将' } },
    ]
  }
}

// 释权(赵匡胤)：弃一张手牌令一名角色弃一张装备牌
class QuanBianSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() > 0 && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'discard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target?.getId(), data: { count: 1, reason: '释权', discardEquipment: true } }]
  }
}

// 攻心(韩信)：展示一名角色一张手牌，基本牌则获得之
class GongXinSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && !!ctx.target && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'stealCard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { count: 1, reason: '攻心', onlyBasic: true } }]
  }
}

// 起义(陈胜)：弃一张牌获得一名角色一张手牌
class QiYiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() > 0 && !!ctx.target && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'stealCard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { count: 1, reason: '起义' } }]
  }
}

// 举荐(狄仁杰)：抽取距离2的角色一张手牌交给任意角色
class JuJianSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && !!ctx.target && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'stealCard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { count: 1, reason: '举荐' } }]
  }
}

// 鸩杀(吕雉)：弃一张牌令已受伤角色失去1点体力
class ZhenShaSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() > 0 && !!ctx.target && ctx.target.getCurrentHp() < ctx.target.getMaxHp() && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'damage', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { amount: 1, reason: '鸩杀', directDamage: true } }]
  }
}

// 及时雨(宋江)：将一张手牌交给一名角色，然后摸一张牌
class JiShiSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() > 0 && !!ctx.target && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '及时雨' } }]
  }
}

// 天香(小乔)：弃两张手牌令一名角色回复1点体力
class TianXiangSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() >= 2 && !!ctx.target && ctx.target.getCurrentHp() < ctx.target.getMaxHp() && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'heal', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { amount: 1, reason: '天香' } }]
  }
}

// 醉酒(武松)：弃一张牌，下一张杀伤害+1
class ZuiJiuSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() > 0 && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'modifyDamage', sourceHeroId: ctx.player.getId(), data: { reason: '醉酒', nextKillBonus: 1 } }]
  }
}

// 女权(武则天)：弃两张牌指定角色交给你一张牌
class NuQuanSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() >= 2 && !!ctx.target && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'stealCard', sourceHeroId: ctx.player.getId(), targetHeroId: ctx.target!.getId(), data: { count: 1, reason: '女权' } }]
  }
}

// 亲征(萧太后)：造成伤害时可令任一角色摸一张牌
class QinZhengSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'damage:deal'
  }
  execute(ctx: SkillContext): SkillEffect[] {
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '亲征' } }]
  }
}

// 篡权(宇文化及)：判定阶段收不同花色判定牌为手牌
class CuanQuanSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:judge' && ctx.player.getHandSize() > 0 && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'drawCard', sourceHeroId: ctx.player.getId(), data: { count: 1, reason: '篡权', judgeRecycle: true } }]
  }
}

// 纵横(孟获)：弃两张同花色手牌，其他角色需出同花色否则受1点伤害
class ZongHengSkill extends SkillExecutor {
  canActivate(ctx: SkillContext): boolean {
    return ctx.data?.event === 'phase:play' && ctx.player.getHandSize() >= 2 && this.checkUses(ctx.player)
  }
  execute(ctx: SkillContext): SkillEffect[] {
    this.recordUse(ctx.player)
    return [{ type: 'damage', sourceHeroId: ctx.player.getId(), data: { amount: 1, reason: '纵横', aoe: true } }]
  }
}

// ============================================================
// 注册表
// ============================================================

const skillRegistry: Map<string, (skill: Skill) => SkillExecutor> = new Map([
  // 被动-受伤
  ['she-shen', (s) => new SheShenSkill(s)],
  ['jian-xiong', (s) => new JianXiongSkill(s)],
  ['fu-chou', (s) => new FuChouSkill(s)],
  ['ji-tian', (s) => new JiTianSkill(s)],
  ['fa-jia', (s) => new FaJiaSkill(s)],
  ['fan-ji', (s) => new FanJiSkill(s)],
  ['man-wu', (s) => new ManWuSkill(s)],
  // 被动-出牌
  ['ba-wang', (s) => new BaWangSkill(s)],
  ['qiang-lue', (s) => new QiangLueSkill(s)],
  ['wu-sheng', (s) => new WuShengSkill(s)],
  ['miao-ji', (s) => new MiaoJiSkill(s)],
  ['ci-ke', (s) => new CiKeSkill(s)],
  ['shen-tan', (s) => new ShenTanSkill(s)],
  ['han-bei', (s) => new HanBeiSkill(s)],
  ['wu-mu', (s) => new WuMuSkill(s)],
  ['zheng-fu', (s) => new ZhengFuSkill(s)],
  ['san-ban-fu', (s) => new SanBanFuSkill(s)],
  ['bing-xian', (s) => new BingXianSkill(s)],
  ['dong-cha', (s) => new DongChaSkill(s)],
  ['ju-ma', (s) => new JuMaSkill(s)],
  ['gui-mian', (s) => new GuiMianSkill(s)],
  ['nan-man', (s) => new NanManSkill(s)],
  ['tou-ji', (s) => new TouJiSkill(s)],
  ['yu-xue', (s) => new YuXueSkill(s)],
  // 主动
  ['zhi-hui', (s) => new ZhiHuiSkill(s)],
  ['quan-bian', (s) => new QuanBianSkill(s)],
  ['gong-xin', (s) => new GongXinSkill(s)],
  ['qi-yi', (s) => new QiYiSkill(s)],
  ['ju-jian', (s) => new JuJianSkill(s)],
  ['zhen-sha', (s) => new ZhenShaSkill(s)],
  ['ji-shi', (s) => new JiShiSkill(s)],
  ['tian-xiang', (s) => new TianXiangSkill(s)],
  ['zui-jiu', (s) => new ZuiJiuSkill(s)],
  ['nu-quan', (s) => new NuQuanSkill(s)],
  ['qin-zheng', (s) => new QinZhengSkill(s)],
  ['cuan-quan', (s) => new CuanQuanSkill(s)],
  ['zong-heng', (s) => new ZongHengSkill(s)],
])

export function createSkillExecutor(skill: Skill): SkillExecutor | null {
  const factory = skillRegistry.get(skill.id)
  return factory ? factory(skill) : null
}

export { SkillExecutor }
export type { SkillContext, SkillEffect }
