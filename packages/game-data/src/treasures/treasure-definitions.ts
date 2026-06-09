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
}

// 主印：英雄专属技能，100%触发
// 辅印：通用概率触发技能，40%-60%触发
export const treasureDefinitions: TreasureDefinition[] = [
  // ===== 主印 ★★★★★ =====
  { id: 'treasure-yu-ren', name: '驭人', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌阶段，你可以弃掉任意数量的手牌和装备区的牌，然后立即摸取等量的牌。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-ao-jian', name: '傲剑', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '你可以使用1张红色手牌(或装备)当作【杀】使用。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-xia-dan', name: '侠胆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '出牌时，可消耗1张手牌与另一名角色拼点。若你赢，本回合可出2张不限距离的【杀】，每张【杀】最多指定2个目标；若你没赢，则本回合不能出【杀】。', baseTriggerRate: 1.0, starLevel: 5 },
  { id: 'treasure-die-hun', name: '蝶魂', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '当你成为非延时锦囊（如【烽火狼烟】、【万箭齐发】）的目标时，你将跳过结算并摸一张牌。', baseTriggerRate: 1.0, starLevel: 5 },
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

  // ===== 辅印 — 攻击类 =====
  { id: 'treasure-qiang-hua', name: '强化', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，有30%几率令此伤害+1。', baseTriggerRate: 0.30, starLevel: 2, category: '攻击' },
  { id: 'treasure-xi-xue', name: '吸血', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，有30%几率回复1点体力。', baseTriggerRate: 0.30, starLevel: 2, category: '攻击' },
  { id: 'treasure-jing-zhun', name: '精准', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，有30%几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.30, starLevel: 2, category: '攻击' },
  { id: 'treasure-sha-zhi-tan', name: '杀之贪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，有30%几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 2, category: '攻击' },
  { id: 'treasure-sha-zhi-xie', name: '杀之卸', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，有30%几率弃置目标一张装备牌。', baseTriggerRate: 0.30, starLevel: 2, category: '攻击' },

  // ===== 辅印 — 防御类 =====
  { id: 'treasure-shang-zhi-chou', name: '伤之仇', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，有30%几率令伤害来源受到1点伤害。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-tan', name: '伤之贪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，有30%几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-yi-xin', name: '医心', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，有30%几率额外回复1点体力。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-qing-ling', name: '轻灵', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，有30%几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-hei-sha-dun', name: '黑杀盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，有30%几率防止此伤害。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-hong-sha-dun', name: '红杀盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，有30%几率防止此伤害。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-xie', name: '伤之卸', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，有30%几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },
  { id: 'treasure-shang-zhi-xue', name: '伤之削', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，有30%几率弃置伤害来源一张手牌。', baseTriggerRate: 0.30, starLevel: 2, category: '防御' },

  // ===== 辅印 — 锦囊类 =====
  { id: 'treasure-tan-shou', name: '贪手', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【探囊取物】获得手牌后，有30%几率额外获得一张。', baseTriggerRate: 0.30, starLevel: 2, category: '锦囊' },
  { id: 'treasure-sheng-you', name: '生有', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，有30%几率额外摸两张牌。', baseTriggerRate: 0.30, starLevel: 2, category: '锦囊' },
  { id: 'treasure-lang-yan', name: '狼烟', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，有30%几率使其伤害+1。', baseTriggerRate: 0.30, starLevel: 2, category: '锦囊' },
  { id: 'treasure-wan-jian', name: '万箭', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，有30%几率使其伤害+1。', baseTriggerRate: 0.30, starLevel: 2, category: '锦囊' },
  { id: 'treasure-chou-xin', name: '抽薪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【釜底抽薪】时，有30%几率额外弃置目标一张手牌。', baseTriggerRate: 0.30, starLevel: 2, category: '锦囊' },
  { id: 'treasure-wu-xie', name: '无懈', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，有30%几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 2, category: '锦囊' },
]

export function getTreasureDefinitionById(id: string): TreasureDefinition | undefined {
  return treasureDefinitions.find(t => t.id === id)
}
