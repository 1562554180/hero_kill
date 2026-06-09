// 卡牌花色
export type Suit = 'spade' | 'heart' | 'diamond' | 'club'

// 卡牌类型
export type CardType = 'basic' | 'scheme' | 'equipment'

// 基本牌名称
export type BasicCardName = '杀' | '闪' | '药' | '血杀' | '暗杀'

// 锦囊牌名称
export type SchemeCardName =
  | '无中生有' | '决斗' | '万箭齐发' | '烽火狼烟'
  | '无懈可击' | '五谷丰登' | '探囊取物' | '釜底抽薪'
  | '借刀杀人' | '手捧雷' | '画地为牢' | '休养生息'

// 装备牌名称
export type EquipmentCardName =
  | '虎头枪' | '盘龙棍' | '狼牙棒' | '芦叶枪' | '龙鳞刀' | '霸王弓'
  | '进攻马' | '防御马'
  | '玉如意' | '护心镜'

// 装备类型
export type EquipmentSlot = 'weapon' | 'attackMount' | 'defenseMount' | 'armor'

// 阵营
export type Faction = '君' | '臣' | '民'

// 回合阶段
export type PhaseType = 'start' | 'judge' | 'draw' | 'play' | 'discard' | 'end'

// 技能类型
export type SkillType = 'active' | 'passive'

// 宝具类型
export type TreasureType = 'main' | 'sub'

// 阵营角色（玩家/友军/敌方）
export type Role = 'player' | 'ally' | 'enemy'

// AI 难度
export type AIDifficulty = 'easy' | 'normal' | 'hard'

// 游戏事件类型
export type GameEventType =
  | 'game:start' | 'game:end'
  | 'turn:start' | 'turn:end'
  | 'phase:start' | 'phase:end'
  | 'card:play' | 'card:draw' | 'card:discard'
  | 'damage:deal' | 'damage:receive' | 'damage:prevent'
  | 'heal' | 'die'
  | 'skill:trigger' | 'skill:resolve'
  | 'judge' | 'equipment:equip' | 'equipment:unequip'
  | 'scheme:nullify'
