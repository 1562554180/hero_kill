import type { Treasure, TreasureType } from '@hero-legend/shared-types'

export type SubTreasureCategory = '攻击' | '防御' | '锦囊'

export interface TreasureDefinition {
  id: string
  name: string
  sourceHeroId: string | null
  sourceSkillId: string | null
  type: TreasureType
  description: string
  baseTriggerRate: number
  starLevel: number
  category?: SubTreasureCategory
  effect?: {
    hpBonus?: number
    rangeBonus?: number
    handBonus?: number
  }
  /** 被动生效（不参与概率触发，每次都视为触发） */
  passive?: boolean
}

// 主印：英雄专属技能，100%触发
// 辅印：通用概率触发技能，40%-60%触发
export const treasureDefinitions: TreasureDefinition[] = [
  // ===== 主印 ★★★★★ =====
  { id: 'treasure-yu-ren', name: '驭人', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以弃掉任意数量的手牌和装备区的牌，然后立即摸取等量的牌。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-ao-jian', name: '傲剑', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你可以使用1张红色手牌(或装备)当作【杀】使用。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-xia-dan', name: '侠胆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌时，可消耗1张手牌与另一名角色拼点。若你赢，本回合可出2张不限距离的【杀】，每张【杀】最多指定2个目标；若你没赢，则本回合不能出【杀】。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-die-hun', name: '蝶魂', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你成为群体锦囊(五谷丰登/万箭齐发/烽火狼烟/休养生息)的目标时，可选择发动：跳过结算并摸1张牌。休养生息仅在血量不满时可发动。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-kong-ju', name: '控局', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你的手牌上限等于当前体力值，且不会因任何原因被弃置或获得。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-she-shen', name: '舍身', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你受到伤害后，可以摸两张牌分给任何人。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-miao-ji', name: '妙计', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你使用锦囊牌时，可以立即摸一张牌。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-fa-jia', name: '法家', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你受到伤害后，可以获得伤害来源一张手牌或装备区的牌。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-tian-lang', name: '天狼', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你使用【杀】无次数限制。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-liao-shang', name: '疗伤', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以弃置一张手牌，令一名角色回复1点体力。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-shu-cai', name: '疏财', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以将任意手牌分给其他角色。若你于此阶段给出的牌达到两张或以上，你回复1点体力。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-bao-tou', name: '豹头', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你使用【杀】指定一名目标后，若其手牌数大于或等于你的体力值，此【杀】不可被【闪】响应。', baseTriggerRate: 1.0, starLevel: 5 },

  // ===== 主印 ★★★★ =====
  { id: 'treasure-qi-yi', name: '起义', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '摸牌阶段，你可以放弃摸牌，改为从至多两名其他角色处各获得一张手牌。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-feng-huo', name: '烽火', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以弃置一张装备牌，视为使用一张【烽火狼烟】。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-fan-ji', name: '反击', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你受到【杀】或【决斗】的伤害后，可以立即向伤害来源使用一张【杀】。此【杀】为红色时不可被【闪】响应。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-guo-se', name: '国色', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你默认装备【玉如意】（即视为一直装备着【玉如意】这张防具牌）。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-jue-ji', name: '绝击', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以弃置一张武器牌或受到一点伤害，然后令一名在你的攻击范围内的角色受到1点伤害。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-zui-jiu', name: '醉酒', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '摸牌阶段，你可以少摸一张牌，然后本回合你使用【杀】或【决斗】造成的伤害+1。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-mei-huo', name: '魅惑', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你可以将方块牌当作【画地为牢】使用。', baseTriggerRate: 1.0, starLevel: 4 },
  { id: 'treasure-hong-zhuang', name: '红妆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你的黑色手牌可以当作红色手牌使用或打出。', baseTriggerRate: 1.0, starLevel: 4 },

  // ===== 主印 ★★★ =====
  { id: 'treasure-ba-wang', name: '霸王', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你使用【杀】时，目标需用两张【闪】才能抵消；与你【决斗】时，目标需出两张【杀】。', baseTriggerRate: 1.0, starLevel: 3 },
  { id: 'treasure-zhi-yu', name: '治愈', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以弃置两张手牌，令一名角色回复1点体力。', baseTriggerRate: 1.0, starLevel: 3 },
  { id: 'treasure-fu-chou', name: '复仇', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你受到伤害后，可以进行判定：若结果不为红桃，则伤害来源需选择一项：受到1点伤害，或弃置两张手牌。', baseTriggerRate: 1.0, starLevel: 3 },
  { id: 'treasure-gong-xin', name: '攻心', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以观看一名其他角色的手牌，并可以将其中的一张红色牌或黑色牌弃置。', baseTriggerRate: 1.0, starLevel: 3 },
  { id: 'treasure-bing-xian', name: '兵仙', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '摸牌阶段，你摸牌的数量+1。', baseTriggerRate: 1.0, starLevel: 3 },
  { id: 'treasure-ci-ke', name: '刺客', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你使用【杀】指定一名目标后，你可以判定：若为红色，此【杀】不可被【闪】响应；若为黑色，此【杀】造成伤害后，你可以弃置其一张牌。', baseTriggerRate: 1.0, starLevel: 3 },
  { id: 'treasure-qing-ying', name: '轻影', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你可以将你的黑色手牌当【闪】使用或打出。', baseTriggerRate: 1.0, starLevel: 3 },

  // ===== 主印 - 身强 (HP 上限 +N) =====
  { id: 'main_shengqiang', name: '身强', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +1。', baseTriggerRate: 1.0, starLevel: 1, effect: { hpBonus: 1 } },
  { id: 'main_shengqiang_2', name: '身强·贰', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +2。', baseTriggerRate: 1.0, starLevel: 2, effect: { hpBonus: 2 } },
  { id: 'main_shengqiang_3', name: '身强·叁', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +3。', baseTriggerRate: 1.0, starLevel: 3, effect: { hpBonus: 3 } },
  { id: 'main_shengqiang_4', name: '身强·肆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +4。', baseTriggerRate: 1.0, starLevel: 4, effect: { hpBonus: 4 } },
  { id: 'main_shengqiang_5', name: '身强·伍', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +5。', baseTriggerRate: 1.0, starLevel: 5, effect: { hpBonus: 5 } },

  // ===== 主印 - 穿杨 (攻击距离 +N) =====
  { id: 'main_chuanyang', name: '穿杨', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +1。', baseTriggerRate: 1.0, starLevel: 1, effect: { rangeBonus: 1 } },
  { id: 'main_chuanyang_2', name: '穿杨·贰', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +2。', baseTriggerRate: 1.0, starLevel: 2, effect: { rangeBonus: 2 } },
  { id: 'main_chuanyang_3', name: '穿杨·叁', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +3。', baseTriggerRate: 1.0, starLevel: 3, effect: { rangeBonus: 3 } },
  { id: 'main_chuanyang_4', name: '穿杨·肆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +4。', baseTriggerRate: 1.0, starLevel: 4, effect: { rangeBonus: 4 } },
  { id: 'main_chuanyang_5', name: '穿杨·伍', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +5。', baseTriggerRate: 1.0, starLevel: 5, effect: { rangeBonus: 5 } },

  // ===== 主印 - 运筹 (手牌上限 +N) =====
  { id: 'main_yunchou', name: '运筹', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +1。', baseTriggerRate: 1.0, starLevel: 1, effect: { handBonus: 1 } },
  { id: 'main_yunchou_2', name: '运筹·贰', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +2。', baseTriggerRate: 1.0, starLevel: 2, effect: { handBonus: 2 } },
  { id: 'main_yunchou_3', name: '运筹·叁', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +3。', baseTriggerRate: 1.0, starLevel: 3, effect: { handBonus: 3 } },
  { id: 'main_yunchou_4', name: '运筹·肆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +4。', baseTriggerRate: 1.0, starLevel: 4, effect: { handBonus: 4 } },
  { id: 'main_yunchou_5', name: '运筹·伍', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +5。', baseTriggerRate: 1.0, starLevel: 5, effect: { handBonus: 5 } },

  // ===== 辅印 - 攻击类 (5 星) =====
  { id: 'treasure-qiang-hua', name: '强化', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率令此伤害+1。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
  { id: 'treasure-qiang-hua-2', name: '强化·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率令此伤害+1。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
  { id: 'treasure-qiang-hua-3', name: '强化·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率令此伤害+1。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
  { id: 'treasure-qiang-hua-4', name: '强化·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率令此伤害+1。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
  { id: 'treasure-qiang-hua-5', name: '强化·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率令此伤害+1。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

  { id: 'treasure-xi-xue', name: '吸血', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率回复1点体力。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
  { id: 'treasure-xi-xue-2', name: '吸血·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率回复1点体力。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
  { id: 'treasure-xi-xue-3', name: '吸血·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率回复1点体力。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
  { id: 'treasure-xi-xue-4', name: '吸血·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率回复1点体力。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
  { id: 'treasure-xi-xue-5', name: '吸血·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率回复1点体力。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

  { id: 'treasure-jing-zhun', name: '精准', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 15% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
  { id: 'treasure-jing-zhun-2', name: '精准·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 20% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
  { id: 'treasure-jing-zhun-3', name: '精准·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 25% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
  { id: 'treasure-jing-zhun-4', name: '精准·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 30% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
  { id: 'treasure-jing-zhun-5', name: '精准·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 35% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

  { id: 'treasure-sha-zhi-tan', name: '杀贪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
  { id: 'treasure-sha-zhi-tan-2', name: '杀贪·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
  { id: 'treasure-sha-zhi-tan-3', name: '杀贪·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
  { id: 'treasure-sha-zhi-tan-4', name: '杀贪·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
  { id: 'treasure-sha-zhi-tan-5', name: '杀贪·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

  { id: 'treasure-sha-zhi-xie', name: '杀卸', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率弃置目标一张装备牌。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
  { id: 'treasure-sha-zhi-xie-2', name: '杀卸·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率弃置目标一张装备牌。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
  { id: 'treasure-sha-zhi-xie-3', name: '杀卸·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率弃置目标一张装备牌。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
  { id: 'treasure-sha-zhi-xie-4', name: '杀卸·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率弃置目标一张装备牌。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
  { id: 'treasure-sha-zhi-xie-5', name: '杀卸·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率弃置目标一张装备牌。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

  // ===== 辅印 - 破咒 (攻击类) =====
  // 你使用【杀】造成伤害后，目标本次伤害的防御型辅印失效（每个目标辅印独立判定）
  { id: 'treasure-po-zhou', name: '破咒', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率令目标本次伤害的防御型辅印失效。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
  { id: 'treasure-po-zhou-2', name: '破咒·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率令目标本次伤害的防御型辅印失效。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
  { id: 'treasure-po-zhou-3', name: '破咒·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率令目标本次伤害的防御型辅印失效。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
  { id: 'treasure-po-zhou-4', name: '破咒·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率令目标本次伤害的防御型辅印失效。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
  { id: 'treasure-po-zhou-5', name: '破咒·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率令目标本次伤害的防御型辅印失效。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

  // ===== 辅印 - 防御类 =====
  { id: 'treasure-shang-zhi-chou', name: '伤仇', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-shang-zhi-chou-2', name: '伤仇·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-chou-3', name: '伤仇·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-shang-zhi-chou-4', name: '伤仇·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-shang-zhi-chou-5', name: '伤仇·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-shang-zhi-tan', name: '伤贪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-shang-zhi-tan-2', name: '伤贪·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-tan-3', name: '伤贪·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-shang-zhi-tan-4', name: '伤贪·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-shang-zhi-tan-5', name: '伤贪·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-yi-xin', name: '医心', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 15% 几率额外回复1点体力。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-yi-xin-2', name: '医心·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 20% 几率额外回复1点体力。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-yi-xin-3', name: '医心·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 25% 几率额外回复1点体力。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-yi-xin-4', name: '医心·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 30% 几率额外回复1点体力。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-yi-xin-5', name: '医心·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 35% 几率额外回复1点体力。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-qing-ling', name: '轻灵', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-qing-ling-2', name: '轻灵·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-qing-ling-3', name: '轻灵·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-qing-ling-4', name: '轻灵·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-qing-ling-5', name: '轻灵·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-hei-sha-dun', name: '黑杀盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 15% 几率防止此伤害。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-hei-sha-dun-2', name: '黑杀盾·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 20% 几率防止此伤害。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-hei-sha-dun-3', name: '黑杀盾·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 25% 几率防止此伤害。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-hei-sha-dun-4', name: '黑杀盾·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 30% 几率防止此伤害。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-hei-sha-dun-5', name: '黑杀盾·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 35% 几率防止此伤害。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-hong-sha-dun', name: '红杀盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 15% 几率防止此伤害。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-hong-sha-dun-2', name: '红杀盾·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 20% 几率防止此伤害。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-hong-sha-dun-3', name: '红杀盾·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 25% 几率防止此伤害。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-hong-sha-dun-4', name: '红杀盾·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 30% 几率防止此伤害。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-hong-sha-dun-5', name: '红杀盾·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 35% 几率防止此伤害。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-hong-sha-yu', name: '红杀御', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为红色【杀】的目标后，基础 15% 几率获取一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-hong-sha-yu-2', name: '红杀御·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为红色【杀】的目标后，基础 20% 几率获取一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-hong-sha-yu-3', name: '红杀御·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为红色【杀】的目标后，基础 25% 几率获取一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-hong-sha-yu-4', name: '红杀御·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为红色【杀】的目标后，基础 30% 几率获取一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-hong-sha-yu-5', name: '红杀御·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为红色【杀】的目标后，基础 35% 几率获取一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-hei-sha-yu', name: '黑杀御', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为黑色【杀】的目标后，基础 15% 几率获取一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-hei-sha-yu-2', name: '黑杀御·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为黑色【杀】的目标后，基础 20% 几率获取一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-hei-sha-yu-3', name: '黑杀御·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为黑色【杀】的目标后，基础 25% 几率获取一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-hei-sha-yu-4', name: '黑杀御·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为黑色【杀】的目标后，基础 30% 几率获取一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-hei-sha-yu-5', name: '黑杀御·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你成为黑色【杀】的目标后，基础 35% 几率获取一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-shi-hua', name: '石化', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率令对方回合直接结束。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-shi-hua-2', name: '石化·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率令对方回合直接结束。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-shi-hua-3', name: '石化·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率令对方回合直接结束。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-shi-hua-4', name: '石化·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率令对方回合直接结束。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-shi-hua-5', name: '石化·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率令对方回合直接结束。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-shang-zhi-xie', name: '伤卸', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-shang-zhi-xie-2', name: '伤卸·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-xie-3', name: '伤卸·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-shang-zhi-xie-4', name: '伤卸·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-shang-zhi-xie-5', name: '伤卸·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  { id: 'treasure-shang-zhi-xue', name: '伤削', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
  { id: 'treasure-shang-zhi-xue-2', name: '伤削·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-xue-3', name: '伤削·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
  { id: 'treasure-shang-zhi-xue-4', name: '伤削·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
  { id: 'treasure-shang-zhi-xue-5', name: '伤削·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

  // ===== 辅印 - 护盾 (防御类) =====
  // 游戏开始时获得护盾，可抵消最多 N 点伤害（N = 星级，1★→1, 5★→5）
  { id: 'treasure-hu-dun', name: '护盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '游戏开始时，你获得 1 点护盾，可抵消最多 1 点伤害。', baseTriggerRate: 0, starLevel: 1, category: '防御', passive: true },
  { id: 'treasure-hu-dun-2', name: '护盾·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '游戏开始时，你获得 2 点护盾，可抵消最多 2 点伤害。', baseTriggerRate: 0, starLevel: 2, category: '防御', passive: true },
  { id: 'treasure-hu-dun-3', name: '护盾·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '游戏开始时，你获得 3 点护盾，可抵消最多 3 点伤害。', baseTriggerRate: 0, starLevel: 3, category: '防御', passive: true },
  { id: 'treasure-hu-dun-4', name: '护盾·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '游戏开始时，你获得 4 点护盾，可抵消最多 4 点伤害。', baseTriggerRate: 0, starLevel: 4, category: '防御', passive: true },
  { id: 'treasure-hu-dun-5', name: '护盾·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '游戏开始时，你获得 5 点护盾，可抵消最多 5 点伤害。', baseTriggerRate: 0, starLevel: 5, category: '防御', passive: true },

  // ===== 辅印 - 锦囊类 =====
  { id: 'treasure-tan-shou', name: '贪手', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 15% 几率额外摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-tan-shou-2', name: '贪手·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 20% 几率额外摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-tan-shou-3', name: '贪手·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 25% 几率额外摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-tan-shou-4', name: '贪手·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 30% 几率额外摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-tan-shou-5', name: '贪手·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 35% 几率额外摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  { id: 'treasure-sheng-you', name: '生有', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 15% 几率额外摸两张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-sheng-you-2', name: '生有·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 20% 几率额外摸两张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-sheng-you-3', name: '生有·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 25% 几率额外摸两张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-sheng-you-4', name: '生有·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 30% 几率额外摸两张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-sheng-you-5', name: '生有·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 35% 几率额外摸两张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  { id: 'treasure-tan-nang', name: '探囊', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【探囊取物】时，基础 15% 几率额外拿一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-tan-nang-2', name: '探囊·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【探囊取物】时，基础 20% 几率额外拿一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-tan-nang-3', name: '探囊·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【探囊取物】时，基础 25% 几率额外拿一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-tan-nang-4', name: '探囊·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【探囊取物】时，基础 30% 几率额外拿一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-tan-nang-5', name: '探囊·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【探囊取物】时，基础 35% 几率额外拿一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  { id: 'treasure-chou-xin', name: '抽薪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【釜底抽薪】时，基础 15% 几率额外弃对方一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-chou-xin-2', name: '抽薪·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【釜底抽薪】时，基础 20% 几率额外弃对方一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-chou-xin-3', name: '抽薪·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【釜底抽薪】时，基础 25% 几率额外弃对方一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-chou-xin-4', name: '抽薪·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【釜底抽薪】时，基础 30% 几率额外弃对方一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-chou-xin-5', name: '抽薪·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【釜底抽薪】时，基础 35% 几率额外弃对方一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  { id: 'treasure-lang-yan', name: '狼烟', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 15% 几率使其伤害+1。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-lang-yan-2', name: '狼烟·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 20% 几率使其伤害+1。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-lang-yan-3', name: '狼烟·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 25% 几率使其伤害+1。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-lang-yan-4', name: '狼烟·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 30% 几率使其伤害+1。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-lang-yan-5', name: '狼烟·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 35% 几率使其伤害+1。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  { id: 'treasure-wan-jian', name: '万箭', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 15% 几率使其伤害+1。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-wan-jian-2', name: '万箭·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 20% 几率使其伤害+1。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-wan-jian-3', name: '万箭·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 25% 几率使其伤害+1。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-wan-jian-4', name: '万箭·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 30% 几率使其伤害+1。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-wan-jian-5', name: '万箭·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 35% 几率使其伤害+1。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  { id: 'treasure-wu-xie', name: '无懈', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-wu-xie-2', name: '无懈·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-wu-xie-3', name: '无懈·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-wu-xie-4', name: '无懈·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-wu-xie-5', name: '无懈·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

  // ===== 辅印 - 饕餮 (锦囊类) =====
  // 你的回合结束时，基础 X% 几率本回合弃牌阶段手牌上限变为 20（下个回合恢复）
  { id: 'treasure-tao-tie', name: '饕餮', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你的回合结束时，基础 15% 几率本回合弃牌阶段手牌上限变为 20。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
  { id: 'treasure-tao-tie-2', name: '饕餮·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你的回合结束时，基础 20% 几率本回合弃牌阶段手牌上限变为 20。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
  { id: 'treasure-tao-tie-3', name: '饕餮·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你的回合结束时，基础 25% 几率本回合弃牌阶段手牌上限变为 20。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
  { id: 'treasure-tao-tie-4', name: '饕餮·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你的回合结束时，基础 30% 几率本回合弃牌阶段手牌上限变为 20。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
  { id: 'treasure-tao-tie-5', name: '饕餮·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你的回合结束时，基础 35% 几率本回合弃牌阶段手牌上限变为 20。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },
]

export function getTreasureDefinitionById(id: string): TreasureDefinition | undefined {
  return treasureDefinitions.find(t => t.id === id)
}
