import type { Stage } from '@hero-legend/shared-types'

export const stages: Stage[] = [
  {
    id: 'xu-zhou',
    name: '徐州',
    description: '群雄逐鹿之地，刘邦故里',
    order: 1,
    battles: [
      { id: 'xz-1', enemies: ['han-xin'], allies: [], isBoss: false },
      { id: 'xz-2', enemies: ['han-xin', 'lv-zhi'], allies: [], isBoss: false },
      { id: 'xz-3', enemies: ['han-xin', 'lv-zhi', 'liu-bang'], allies: [], isBoss: false },
      { id: 'xz-4', enemies: ['han-xin', 'lv-zhi', 'liu-bang', 'yu-ji'], allies: [], isBoss: false },
      { id: 'xz-boss', enemies: ['wu-san-gui', 'han-xin', 'lv-zhi'], allies: ['xiao-tai-hou', 'lan-ling-wang'], isBoss: true },
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
      { id: 'yz-1', enemies: ['cheng-yao-jin'], allies: [], isBoss: false },
      { id: 'yz-2', enemies: ['cheng-yao-jin', 'qin-qiong'], allies: [], isBoss: false },
      { id: 'yz-3', enemies: ['cheng-yao-jin', 'qin-qiong', 'song-jiang'], allies: [], isBoss: false },
      { id: 'yz-4', enemies: ['cheng-yao-jin', 'qin-qiong', 'song-jiang', 'li-shi-shi'], allies: [], isBoss: false },
      { id: 'yz-boss', enemies: ['yu-wen-hua-ji', 'zhao-kuang-yin', 'qin-qiong'], allies: ['xiao-tai-hou', 'lan-ling-wang'], isBoss: true },
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
      { id: 'yzh-1', enemies: ['xiao-qiao'], allies: [], isBoss: false },
      { id: 'yzh-2', enemies: ['xiao-qiao', 'guan-yu'], allies: [], isBoss: false },
      { id: 'yzh-3', enemies: ['xiao-qiao', 'guan-yu', 'cao-cao'], allies: [], isBoss: false },
      { id: 'yzh-4', enemies: ['xiao-qiao', 'guan-yu', 'cao-cao', 'zhuge-liang'], allies: [], isBoss: false },
      { id: 'yzh-boss', enemies: ['meng-huo', 'guan-yu', 'cao-cao'], allies: ['xiao-tai-hou', 'lan-ling-wang'], isBoss: true },
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
