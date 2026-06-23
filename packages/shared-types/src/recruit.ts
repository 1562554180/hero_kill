// 抽卡 / 招贤馆 相关类型

export type RecruitPool = 'baili' | 'qianli' | 'wanli'

/** 池子的游戏数据配置 */
export interface PoolConfig {
  pool: RecruitPool
  name: string
  /** 抽卡消耗的门票类型 (对应 Material.type) */
  costTicket: 'bailiTicket' | 'qianliTicket' | 'wanliTicket'
  /** 单抽消耗门票数 */
  costPerDraw: 1
  /** 十连消耗门票数 (9 = 10 抽打 9 折) */
  costTenPull: 9
  /** 单抽星级权重表, 缺失星级 = 0 */
  starWeights: Record<1 | 2 | 3 | 4 | 5, number>
  /** 十连最后一抽保底星级 (0 = 无保底) */
  tenPullGuaranteedStar: 1 | 2 | 3 | 4 | 5 | 0
  /** 每日首次十连保底: 写入 save.dailyRecruitGuarantee 的字段名. null = 无保底 */
  dailyResetKey: 'qianliDate' | 'wanliDate' | null
}

/** 英雄石: 抽到即锁定具体英雄 + 星级, 使用后生成 HeroInstance */
export interface HeroStone {
  stoneId: string             // uuid, 唯一标识一颗石头
  heroId: string              // 已锁定到具体英雄配置
  starLevel: 1 | 2 | 3 | 4 | 5
  pool: RecruitPool           // 来源池 (用于后续扩展/追溯)
  acquiredAt: number          // 时间戳 ms
}

/** 单次抽卡 API 的响应 */
export interface DrawResult {
  success: true
  stones: HeroStone[]
  /** 更新后的每日保底状态, 前端用来更新倒计时/标识 */
  updatedGuarantee: {
    qianliDate: string | null
    wanliDate: string | null
  }
  /** 抽卡后剩余门票数 */
  remainingTickets: number
}

export interface DrawError {
  success?: false
  error: string
}