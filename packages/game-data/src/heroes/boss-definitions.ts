import type { Hero } from '@hero-legend/shared-types'

export const bossHeroes: Hero[] = [
  {
    id: 'wu-san-gui', name: '吴三桂', faction: '臣', starLevel: 5, baseHp: 5,
    description: '投机者，引清兵入关',
    skills: [
      { id: 'tou-ji', name: '投机', type: 'passive', description: '场上角色<5时防御加成，≥5时攻击加成', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'yu-wen-hua-ji', name: '宇文化及', faction: '臣', starLevel: 5, baseHp: 5,
    description: '篡权者，弑主自立',
    skills: [
      { id: 'cuan-quan', name: '篡权', type: 'active', description: '判定阶段，可打出一张手牌，与判定牌不同花色的判定牌全部收为手牌', maxUsesPerTurn: 1 },
      { id: 'long-luo', name: '笼络', type: 'active', description: '回合结束，弃X张牌指定X名角色，其受到的伤害转移给你1点', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'meng-huo', name: '孟获', faction: '臣', starLevel: 5, baseHp: 6,
    description: '南蛮之王，七擒七纵',
    skills: [
      { id: 'zong-heng', name: '纵横', type: 'active', description: '出牌阶段弃两张同花色手牌，其他角色需出同花色牌，否则受1点伤害', maxUsesPerTurn: 1 },
      { id: 'nan-man', name: '南蛮', type: 'passive', description: '受你杀伤害的目标，其回合跳过摸牌阶段', triggerEvent: 'damage:deal' },
    ],
  },
  {
    id: 'xiao-tai-hou', name: '萧太后', faction: '君', starLevel: 4, baseHp: 4,
    description: '辽国太后，亲征沙场',
    skills: [
      { id: 'ju-ma', name: '拒马', type: 'passive', description: '你无视目标坐骑的所有效果', triggerEvent: 'card:play' },
      { id: 'qin-zheng', name: '亲征', type: 'active', description: '回合内每次造成伤害，可令任一目标或自己摸一张牌' },
    ],
  },
  {
    id: 'lan-ling-wang', name: '兰陵王', faction: '臣', starLevel: 4, baseHp: 4,
    description: '貌美将军，戴面具出战',
    skills: [
      { id: 'gui-mian', name: '鬼面', type: 'passive', description: '你对一名对象造成伤害后，本回合可无限对其出杀', triggerEvent: 'damage:deal' },
      { id: 'yu-xue', name: '浴血', type: 'passive', description: '你对目标造成伤害时增加标记，回合结束3+标记时所有标记目标流失1体力', triggerEvent: 'turn:end' },
    ],
  },
]
