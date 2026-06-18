import type { Stage } from '@hero-legend/shared-types'

// 关卡敌人最低 3 人, 越往后星级越高, BOSS 固定 5★ + 满配宝具
// 详细难度梯度由 generateEnemyInstances 计算, 此处只定义英雄ID
export const stages: Stage[] = [
  {
    id: 'xu-zhou',
    name: '徐州',
    description: '群雄逐鹿之地，刘邦故里',
    order: 1,
    battles: [
      // 1-3★ 敌人, 培养新手感觉
      { id: 'xz-1', enemies: ['chen-sheng', 'song-jiang', 'li-kui'], allies: [], isBoss: false },
      { id: 'xz-2', enemies: ['chen-sheng', 'song-jiang', 'xiao-qiao', 'cheng-yao-jin'], allies: [], isBoss: false },
      { id: 'xz-3', enemies: ['lv-zhi', 'qin-qiong', 'chen-sheng', 'xiao-qiao'], allies: [], isBoss: false },
      { id: 'xz-4', enemies: ['lv-zhi', 'qin-qiong', 'yu-ji', 'wu-song'], allies: [], isBoss: false },
      { id: 'xz-boss', enemies: ['wu-san-gui', 'han-xin', 'lv-zhi'], allies: [], isBoss: true },
    ],
    rewards: {
      gold: 500,
      growthValue: 100,
      heroFragmentChance: 0.3,
      treasureFragmentChance: 0.2,
      bossBonus: { gold: 1000, treasureChance: 0.5 },
    },
  },
  {
    id: 'yang-zhou',
    name: '扬州',
    description: '隋末乱世，瓦岗英雄',
    order: 2,
    battles: [
      // 2-4★ 敌人, 中等难度
      { id: 'yz-1', enemies: ['qin-qiong', 'song-jiang', 'chen-sheng', 'li-kui'], allies: [], isBoss: false },
      { id: 'yz-2', enemies: ['zhao-kuang-yin', 'qin-qiong', 'yu-ji', 'xiao-qiao'], allies: [], isBoss: false },
      { id: 'yz-3', enemies: ['han-xin', 'qin-qiong', 'lv-zhi', 'zhao-kuang-yin'], allies: [], isBoss: false },
      { id: 'yz-4', enemies: ['han-xin', 'xiang-yu', 'wu-song', 'yu-ji'], allies: [], isBoss: false },
      { id: 'yz-boss', enemies: ['yu-wen-hua-ji', 'zhao-kuang-yin', 'han-xin', 'qin-qiong'], allies: [], isBoss: true },
    ],
    rewards: {
      gold: 800,
      growthValue: 150,
      heroFragmentChance: 0.35,
      treasureFragmentChance: 0.25,
      bossBonus: { gold: 1500, treasureChance: 0.55 },
    },
  },
  {
    id: 'yi-zhou',
    name: '益州',
    description: '天府之国，三国鼎立',
    order: 3,
    battles: [
      // 3-5★ 敌人, 后期高难度
      { id: 'yzh-1', enemies: ['xiang-yu', 'han-xin', 'qin-qiong', 'cao-cao'], allies: [], isBoss: false },
      { id: 'yzh-2', enemies: ['xiang-yu', 'cao-cao', 'wu-ze-tian', 'yue-fei'], allies: [], isBoss: false },
      { id: 'yzh-3', enemies: ['li-shi-min', 'han-xin', 'wu-ze-tian', 'tie-mu-zhen'], allies: [], isBoss: false },
      { id: 'yzh-4', enemies: ['ying-zheng', 'han-xin', 'xiang-yu', 'cao-cao'], allies: [], isBoss: false },
      { id: 'yzh-boss', enemies: ['meng-huo', 'guan-yu', 'zhuge-liang', 'cao-cao'], allies: [], isBoss: true },
    ],
    rewards: {
      gold: 1200,
      growthValue: 200,
      heroFragmentChance: 0.4,
      treasureFragmentChance: 0.3,
      bossBonus: { gold: 2000, treasureChance: 0.6 },
    },
  },
]

export function getStageById(id: string): Stage | undefined {
  return stages.find(s => s.id === id)
}
