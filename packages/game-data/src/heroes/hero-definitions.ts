import type { Hero } from '@hero-legend/shared-types'

export const heroes: Hero[] = [
  // ===== 君阵营 =====
  {
    id: 'ying-zheng', name: '嬴政', faction: '君', starLevel: 5, baseHp: 4,
    description: '始皇帝，千古一帝',
    skills: [
      { id: 'ji-tian', name: '集权', type: 'passive', description: '当你受到伤害时，允许马上获得对你造成伤害的那张牌', triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'liu-bang', name: '刘邦', faction: '君', starLevel: 3, baseHp: 4,
    description: '汉高祖，知人善任，驭将有方',
    skills: [
      { id: 'yu-ren', name: '驭人', type: 'active', description: '出牌阶段，你可以弃置任意数量的手牌或装备，然后摸等量的牌（每回合限一次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'zhao-kuang-yin', name: '赵匡胤', faction: '君', starLevel: 3, baseHp: 4,
    description: '宋太祖，杯酒释兵权',
    skills: [
      { id: 'shi-quan', name: '释权', type: 'active', description: '出牌阶段，你的任意一张黑色手牌或装备区的牌，都可以当作【釜底抽薪】使用' },
    ],
  },
  {
    id: 'gou-jian', name: '勾践', faction: '君', starLevel: 3, baseHp: 3,
    description: '越王，卧薪尝胆',
    skills: [
      { id: 'yin-ren', name: '隐忍', type: 'passive', description: '只要在自己出牌阶段没对别人主动出过【杀】，回合结束时可不用弃牌', triggerEvent: 'turn:end' },
      { id: 'tu-qiang', name: '图强', type: 'passive', description: '在自己的回合外，每打出一张【闪】可立即摸一张牌', triggerEvent: 'damage:prevent' },
    ],
  },
  {
    id: 'xiang-yu', name: '项羽', faction: '君', starLevel: 4, baseHp: 4,
    description: '西楚霸王，力拔山兮气盖世',
    skills: [
      { id: 'ba-wang', name: '霸王', type: 'passive', description: '你出【杀】时，目标需出两张【闪】才能抵消；决斗时对手需出两张【杀】', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'li-shi-min', name: '李世民', faction: '君', starLevel: 4, baseHp: 4,
    description: '唐太宗，贞观之治',
    skills: [
      { id: 'kong-ju', name: '控局', type: 'passive', description: '手牌数≤体力上限时跳过弃牌阶段；手牌数<体力上限时免疫探囊取物和釜底抽薪；手牌数>体力上限时免疫画地为牢', triggerEvent: 'phase:start' },
    ],
  },
  {
    id: 'wu-ze-tian', name: '武则天', faction: '君', starLevel: 4, baseHp: 4,
    description: '千古第一女帝',
    skills: [
      { id: 'nu-quan', name: '女权', type: 'passive', description: '对男性角色出【决斗】对方需出两【杀】，男性对你出【决斗】无效', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'cao-cao', name: '曹操', faction: '君', starLevel: 4, baseHp: 4,
    description: '乱世奸雄，治世之能臣',
    skills: [
      { id: 'jian-xiong', name: '奸雄', type: 'active', description: '出牌阶段，可打出一张手牌或装备牌，当作本回合内前一张打出的牌使用（每回合限一次）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'chen-sheng', name: '陈胜', faction: '君', starLevel: 2, baseHp: 4,
    description: '飞翔的鸿鹄，大泽乡起义',
    skills: [
      { id: 'qi-yi', name: '起义', type: 'passive', description: '摸牌阶段可选择放弃摸牌，从最多两名其他玩家手里各抽一张牌', triggerEvent: 'phase:start' },
    ],
  },
  {
    id: 'tie-mu-zhen', name: '铁木真', faction: '君', starLevel: 4, baseHp: 4,
    description: '成吉思汗，一代天骄',
    skills: [
      { id: 'qi-she', name: '骑射', type: 'passive', description: '默认装备距离为1的进攻马（攻击距离+1）', triggerEvent: 'game:start' },
      { id: 'qiang-lue', name: '强掠', type: 'passive', description: '打出的【杀】被闪避可进行判定，若为黑色花色可抽取对方一张牌', triggerEvent: 'damage:prevent' },
    ],
  },
  {
    id: 'zhu-yuan-zhang', name: '朱元璋', faction: '君', starLevel: 3, baseHp: 4,
    description: '明太祖，从乞丐到皇帝',
    skills: [
      { id: 'qiang-yun', name: '强运', type: 'passive', description: '当你手牌为空时，你摸两张牌（无次数限制）', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'lv-zhi', name: '吕雉', faction: '君', starLevel: 3, baseHp: 4,
    description: '汉高后，临朝称制',
    skills: [
      { id: 'zhen-sha', name: '鸩杀', type: 'passive', description: '场上有角色进入濒死状态求【药】时，你可对其使用【药】使其立即阵亡', triggerEvent: 'heal' },
      { id: 'xu-mou', name: '蓄谋', type: 'active', description: '回合结束可选择摸三张牌，但将跳过下一回合', maxUsesPerTurn: 1 },
    ],
  },

  // ===== 臣阵营 =====
  {
    id: 'shang-yang', name: '商鞅', faction: '臣', starLevel: 3, baseHp: 3,
    description: '法家代表，变法强国',
    skills: [
      { id: 'bian-fa', name: '变法', type: 'active', description: '判定牌生效前，你可弃一张手牌替换判定牌（每回合限一次）', maxUsesPerTurn: 1 },
      { id: 'fa-jia', name: '法家', type: 'passive', description: '你受到伤害后，可立即抽取伤害来源的一张手牌', triggerEvent: 'damage:receive' },
    ],
  },
  {
    id: 'yang-yan-zhao', name: '杨延昭', faction: '臣', starLevel: 3, baseHp: 4,
    description: '杨家将，天波府六郎',
    skills: [
      { id: 'tian-lang', name: '天狼', type: 'passive', description: '每回合出【杀】的数量不受限制', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'tan-tai-ming', name: '澹台名', faction: '臣', starLevel: 4, baseHp: 4,
    description: '修罗剑魔，傲剑无双',
    skills: [
      { id: 'ao-jian', name: '傲剑', type: 'passive', description: '可将红色花色的牌（手牌或装备区）当作【杀】使用', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'qin-qiong', name: '秦琼', faction: '臣', starLevel: 3, baseHp: 4,
    description: '门神，忠义无双',
    skills: [
      { id: 'fan-ji', name: '反击', type: 'passive', description: '被【杀】或【决斗】损血后，可立即对伤害来源打出一张【杀】（红色不可回避）', triggerEvent: 'damage:receive' },
      { id: 'men-shen', name: '门神', type: 'passive', description: '回合结束可指定一目标，直到下回合开始，对该目标的【杀】和【决斗】均视为对你打出', triggerEvent: 'turn:end' },
    ],
  },
  {
    id: 'yu-ji', name: '虞姬', faction: '臣', starLevel: 3, baseHp: 3,
    description: '霸王别姬，贞烈无双',
    skills: [
      { id: 'she-shen', name: '舍身', type: 'passive', description: '每掉1点血就能摸两张牌，可将这两张牌任意分配给其他人或自己留着', triggerEvent: 'damage:receive' },
      { id: 'jue-bie', name: '诀别', type: 'passive', description: '进入濒死状态时，可指定一名男性英雄，阵亡后所有牌归入此角色手牌', triggerEvent: 'die' },
    ],
  },
  {
    id: 'yue-fei', name: '岳飞', faction: '臣', starLevel: 4, baseHp: 4,
    description: '精忠报国',
    skills: [
      { id: 'wu-mu', name: '武穆', type: 'passive', description: '可将【杀】当作【闪】使用，或将【闪】当作【杀】使用', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'han-xin', name: '韩信', faction: '臣', starLevel: 4, baseHp: 3,
    description: '兵仙，国士无双',
    skills: [
      { id: 'gong-xin', name: '攻心', type: 'active', description: '出牌时可让一人指定一种花色并选择你一张手牌，花色相符对方获得该牌，不符则对方掉1血并获得该牌', maxUsesPerTurn: 1 },
      { id: 'bing-xian', name: '兵仙', type: 'passive', description: '每个摸牌阶段可摸三张牌', triggerEvent: 'phase:start' },
    ],
  },
  {
    id: 'guan-yu', name: '关羽', faction: '臣', starLevel: 4, baseHp: 4,
    description: '武圣，义薄云天',
    skills: [
      { id: 'bu-dao', name: '补刀', type: 'passive', description: '回合外，攻击范围内的角色被【杀】掉血后，你能对该角色打出一张【杀】，若造成伤害则可继续出【杀】', triggerEvent: 'damage:receive' },
      { id: 'dan-qi', name: '单骑', type: 'passive', description: '默认视为你装备着一匹距离为1的进攻马', triggerEvent: 'game:start' },
    ],
  },
  {
    id: 'zhuge-liang', name: '诸葛亮', faction: '臣', starLevel: 5, baseHp: 3,
    description: '卧龙，鞠躬尽瘁死而后已',
    skills: [
      { id: 'miao-ji', name: '妙计', type: 'passive', description: '每当你使用一张非延时类锦囊牌时，可马上从牌堆摸一张牌', triggerEvent: 'card:play' },
      { id: 'dong-cha', name: '洞察', type: 'passive', description: '你不能成为黑桃花色锦囊牌的目标', triggerEvent: 'card:play' },
    ],
  },
  {
    id: 'cheng-yao-jin', name: '程咬金', faction: '臣', starLevel: 2, baseHp: 4,
    description: '三板斧，混世魔王',
    skills: [
      { id: 'san-ban-fu', name: '三板斧', type: 'active', description: '对其他角色出【杀】：对方出0闪掉2血（你弃一手牌）；出1闪掉1血（你也掉1血）；出2闪不掉血（你掉1血）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'jing-ke', name: '荆轲', faction: '民', starLevel: 3, baseHp: 3,
    description: '易水壮士，图穷匕见',
    skills: [
      { id: 'ci-ke', name: '刺客', type: 'passive', description: '你对其他角色出【杀】时可判定：红色不可被闪抵消；黑色造成伤害后可弃对方一张牌', triggerEvent: 'card:play' },
      { id: 'jue-ji', name: '绝击', type: 'active', description: '出牌阶段，你可以弃置一张武器牌（装备区或手牌）或受到一点伤害，然后令一名在你的攻击范围内的角色受到1点伤害。（每回合限一次）', maxUsesPerTurn: 1 },
    ],
  },

  // ===== 民阵营 =====
  {
    id: 'wu-song', name: '武松', faction: '民', starLevel: 3, baseHp: 4,
    description: '行者，景阳冈打虎',
    skills: [
      { id: 'zui-jiu', name: '醉酒', type: 'active', description: '摸牌时可选择只摸一张，若如此做，本回合对别人出【杀】或【决斗】造成的伤害+1', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'song-jiang', name: '宋江', faction: '民', starLevel: 2, baseHp: 4,
    description: '及时雨，梁山之主',
    skills: [
      { id: 'shu-cai', name: '疏财', type: 'active', description: '出牌阶段可将手牌发给任意角色，发出两张或以上时自己恢复1点体力（每回合最多恢复1点）', maxUsesPerTurn: 1 },
    ],
  },
  {
    id: 'li-shi-shi', name: '李师师', faction: '民', starLevel: 3, baseHp: 3,
    description: '青楼名妓，倾国倾城',
    skills: [
      { id: 'man-wu', name: '曼舞', type: 'active', description: '当你受到伤害时，你可以弃一张红桃花色的手牌，将伤害转移给另一名角色，被转移的角色摸X张牌，X为你损失的体力值', triggerEvent: 'damage:receive' },
      { id: 'hong-zhuang', name: '红妆', type: 'passive', description: '你使用或判定结果的牌，黑桃花色都视为红桃' },
    ],
  },
  {
    id: 'xiao-qiao', name: '小乔', faction: '民', starLevel: 2, baseHp: 3,
    description: '国色天香，江东二乔之一',
    skills: [
      { id: 'guo-se', name: '国色', type: 'passive', description: '当你没有防具时，默认装备【玉如意】（视为一直装备着该防具）', triggerEvent: 'game:start' },
      { id: 'tian-xiang', name: '天香', type: 'passive', description: '判定开始前，你可以弃1张牌，取消本次判定效果。判定牌不消失（如画地为牢/手捧雷仍保留在判定区，不顺延），同一回合仍会再次判定', triggerEvent: 'judge' },
    ],
  },
  {
    id: 'li-kui', name: '李逵', faction: '民', starLevel: 2, baseHp: 4,
    description: '黑旋风，性如烈火',
    skills: [
      { id: 'fu-chou', name: '复仇', type: 'passive', description: '你受到伤害后，你可以对伤害来源造成1点伤害', triggerEvent: 'damage:receive' },
    ],
  },
]

export function getHeroById(id: string): Hero | undefined {
  return heroes.find(h => h.id === id)
}
