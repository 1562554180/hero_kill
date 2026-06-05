import type { Hero } from '@hero-legend/shared-types'

export const heroes: Hero[] = [
  // === 君阵营 ===
  {
    id: 'liu-bang', name: '刘邦', faction: '君', starLevel: 3, baseHp: 4,
    description: '汉高祖，知人善任，驭将有方',
    skills: [
      { id: 'zhi-hui', name: '驭将', type: 'active', description: '出牌阶段，你可以弃一张手牌，然后摸两张牌（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'xiang-yu', name: '项羽', faction: '君', starLevel: 4, baseHp: 4,
    description: '西楚霸王，力拔山兮气盖世',
    skills: [
      { id: 'ba-wang', name: '霸王', type: 'passive', description: '你出杀时，对方需出两张闪才能抵消', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'cao-cao', name: '曹操', faction: '君', starLevel: 4, baseHp: 4,
    description: '魏武帝，治世之能臣，乱世之奸雄',
    skills: [
      { id: 'jian-xiong', name: '奸雄', type: 'passive', description: '当你受到伤害时，你可以获得伤害来源的一张手牌', triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'zhao-kuang-yin', name: '赵匡胤', faction: '君', starLevel: 3, baseHp: 4,
    description: '宋太祖，杯酒释兵权',
    skills: [
      { id: 'quan-bian', name: '释权', type: 'active', description: '出牌阶段，你可以弃一张手牌，令一名其他角色弃一张装备牌（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'zhu-yuan-zhang', name: '朱元璋', faction: '君', starLevel: 3, baseHp: 4,
    description: '明太祖，从乞丐到皇帝',
    skills: [
      { id: 'qiang-lue', name: '强略', type: 'passive', description: '在你出牌阶段，当你使用了最后一张手牌时，你摸一张牌', triggerEvent: 'card:play' },
    ],
  },

  // === 臣阵营 ===
  {
    id: 'han-xin', name: '韩信', faction: '臣', starLevel: 4, baseHp: 3,
    description: '兵仙，国士无双',
    skills: [
      { id: 'bing-xian', name: '兵仙', type: 'passive', description: '摸牌阶段，你额外摸一张牌', triggerEvent: 'phase:start' },
      { id: 'gong-xin', name: '攻心', type: 'active', description: '出牌阶段，你可以展示一名其他角色的一张手牌，如果是基本牌则你获得之（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'guan-yu', name: '关羽', faction: '臣', starLevel: 4, baseHp: 4,
    description: '武圣，义薄云天',
    skills: [
      { id: 'wu-sheng', name: '武圣', type: 'passive', description: '你可以将你的任意一张红色手牌当杀使用', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'zhuge-liang', name: '诸葛亮', faction: '臣', starLevel: 5, baseHp: 3,
    description: '卧龙，鞠躬尽瘁死而后已',
    skills: [
      { id: 'miao-ji', name: '妙计', type: 'passive', description: '每当你使用一张锦囊牌时，你可以摸一张牌', triggerEvent: 'card:play' },
      { id: 'dong-cha', name: '洞察', type: 'passive', description: '你不能成为黑色锦囊牌的目标', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'shang-yang', name: '商鞅', faction: '臣', starLevel: 3, baseHp: 3,
    description: '法家代表，变法强国',
    skills: [
      { id: 'fa-jia', name: '法家', type: 'passive', description: '你造成伤害后，你可以获得对方的一张手牌', triggerEvent: 'damage:deal' },
    ],
  },
  {
    id: 'chen-sheng', name: '陈胜', faction: '臣', starLevel: 2, baseHp: 4,
    description: '大泽乡起义领导者',
    skills: [
      { id: 'qi-yi', name: '起义', type: 'active', description: '出牌阶段，你可以弃一张手牌，然后获得一名其他角色的一张手牌（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'jing-ke', name: '荆轲', faction: '臣', starLevel: 3, baseHp: 3,
    description: '刺客，图穷匕见',
    skills: [
      { id: 'ci-ke', name: '刺客', type: 'passive', description: '你对其他角色出杀时，可进行一次判定，若为红色则伤害+1', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'di-ren-jie', name: '狄仁杰', faction: '臣', starLevel: 3, baseHp: 3,
    description: '神探，断案如神',
    skills: [
      { id: 'ju-jian', name: '举荐', type: 'active', description: '出牌阶段，你可以抽取一名距离为2的角色一张手牌，交给任意角色（每回合限用1次）', maxUsesPerTurn: 1 },
      { id: 'shen-tan', name: '神探', type: 'passive', description: '你可以将任意手牌当无懈可击使用', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'yang-yan-zhao', name: '杨延昭', faction: '臣', starLevel: 3, baseHp: 4,
    description: '杨家将，天波府六郎',
    skills: [
      { id: 'han-bei', name: '捍北', type: 'passive', description: '你每回合可以出两次杀', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'yue-fei', name: '岳飞', faction: '臣', starLevel: 4, baseHp: 4,
    description: '精忠报国',
    skills: [
      { id: 'wu-mu', name: '武穆', type: 'passive', description: '你可以将杀当闪使用，将闪当杀使用', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'tie-mu-zhen', name: '铁木真', faction: '臣', starLevel: 4, baseHp: 4,
    description: '成吉思汗，一代天骄',
    skills: [
      { id: 'zheng-fu', name: '征服', type: 'passive', description: '你对距离为1的角色出杀时，对方不能使用闪', triggerEvent: 'card:play' },
    ],
  },

  // === 民阵营 ===
  {
    id: 'yu-ji', name: '虞姬', faction: '民', starLevel: 3, baseHp: 3,
    description: '霸王别姬，贞烈无双',
    skills: [
      { id: 'she-shen', name: '舍身', type: 'passive', description: '你受到伤害时可以摸两张牌', triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'lv-zhi', name: '吕雉', faction: '民', starLevel: 3, baseHp: 3,
    description: '汉高后，临朝称制',
    skills: [
      { id: 'zhen-sha', name: '鸩杀', type: 'active', description: '出牌阶段，你可以弃一张手牌，令一名已受伤角色失去1点体力（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'cheng-yao-jin', name: '程咬金', faction: '民', starLevel: 2, baseHp: 4,
    description: '三板斧，混世魔王',
    skills: [
      { id: 'san-ban-fu', name: '三板斧', type: 'passive', description: '你出杀被闪抵消后，可以额外再出一张杀', triggerEvent: 'damage:prevent' },
    ],
  },
  {
    id: 'qin-qiong', name: '秦琼', faction: '民', starLevel: 3, baseHp: 4,
    description: '门神，忠义无双',
    skills: [
      { id: 'fan-ji', name: '反击', type: 'passive', description: '当你受到杀的伤害时，你可以对伤害来源出一张杀', triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'song-jiang', name: '宋江', faction: '民', starLevel: 2, baseHp: 3,
    description: '及时雨，梁山之主',
    skills: [
      { id: 'ji-shi', name: '及时雨', type: 'active', description: '出牌阶段，你可以将一张手牌交给一名其他角色，然后你摸一张牌（每回合限用2次）', maxUsesPerTurn: 2 },
    ],
  },
  {
    id: 'li-shi-shi', name: '李师师', faction: '民', starLevel: 3, baseHp: 3,
    description: '青楼名妓，倾国倾城',
    skills: [
      { id: 'man-wu', name: '曼舞', type: 'active', description: '当你受到伤害时，你可以弃一张手牌，将伤害转移给另一名角色（每回合限用1次）', maxUsesPerTurn: 1, triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'xiao-qiao', name: '小乔', faction: '民', starLevel: 2, baseHp: 3,
    description: '江东二乔之一',
    skills: [
      { id: 'tian-xiang', name: '天香', type: 'active', description: '出牌阶段，你可以弃两张手牌，令一名角色回复1点体力（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'li-kui', name: '李逵', faction: '民', starLevel: 2, baseHp: 4,
    description: '黑旋风，性如烈火',
    skills: [
      { id: 'fu-chou', name: '复仇', type: 'passive', description: '你受到伤害后，你可以对伤害来源造成1点伤害', triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'wu-song', name: '武松', faction: '民', starLevel: 3, baseHp: 4,
    description: '行者，景阳冈打虎',
    skills: [
      { id: 'zui-jiu', name: '醉酒', type: 'active', description: '出牌阶段，你可以弃一张手牌，本回合你的下一张杀伤害+1（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'wu-ze-tian', name: '武则天', faction: '民', starLevel: 4, baseHp: 3,
    description: '千古第一女帝',
    skills: [
      { id: 'nu-quan', name: '女权', type: 'active', description: '出牌阶段，你可以弃两张牌，然后指定一名其他角色，该角色需交给你一张牌（每回合限用1次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'ying-zheng', name: '嬴政', faction: '君', starLevel: 5, baseHp: 4,
    description: '始皇帝，千古一帝',
    skills: [
      { id: 'ji-tian', name: '集权', type: 'passive', description: '当你受到伤害时，你可以获得造成伤害的牌', triggerEvent: 'damage:receive' },
    ],
  },
]

export function getHeroById(id: string): Hero | undefined {
  return heroes.find(h => h.id === id)
}
