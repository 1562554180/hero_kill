import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { SaveService } from '../save/save.service'
import { getPoolConfig, rollHero, rollStar } from '@hero-legend/game-data'
import type { HeroStone, RecruitPool } from '@hero-legend/shared-types'

function todayUtcDate(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

@Injectable()
export class RecruitService {
  constructor(private saveService: SaveService) {}

  /**
   * 抽卡: 1 单抽 / 10 十连
   * 返回: { stones, updatedGuarantee, remainingTickets } 或 { error }
   */
  async draw(userId: string, pool: RecruitPool, count: 1 | 10): Promise<any> {
    if (count !== 1 && count !== 10) return { error: 'count 必须为 1 或 10' }

    const cfg = getPoolConfig(pool)
    const cost = count === 10 ? cfg.costTenPull : cfg.costPerDraw

    // 1) 检查门票余额 (不允许透支)
    const save = await this.saveService.getSave(userId)
    if (!save) return { error: '存档不存在' }
    const ticket = (save.materials as any[]).find(m => m.type === cfg.costTicket)
    const current = ticket?.amount ?? 0
    if (current < cost) return { error: `${cfg.name}门票不足 (需 ${cost}, 持 ${current})` }

    // 2) 判断每日首次十连
    let usedDailyFirst = false
    if (count === 10 && cfg.dailyResetKey) {
      const today = todayUtcDate()
      const lastDate = (save.dailyRecruitGuarantee as any)?.[cfg.dailyResetKey] ?? null
      if (lastDate !== today) {
        usedDailyFirst = true
      }
    }

    // 3) 扣门票
    const spend = await this.saveService.spendMaterial(userId, cfg.costTicket, cost)
    if (!spend) return { error: `${cfg.name}门票不足` }
    const remainingTickets = spend.newAmount

    // 4) 写每日保底字段
    let updatedGuarantee = {
      qianliDate: (save.dailyRecruitGuarantee as any)?.qianliDate ?? null,
      wanliDate: (save.dailyRecruitGuarantee as any)?.wanliDate ?? null,
    }
    if (usedDailyFirst && cfg.dailyResetKey) {
      await this.saveService.updateDailyGuarantee(userId, cfg.dailyResetKey, todayUtcDate())
      updatedGuarantee = { ...updatedGuarantee, [cfg.dailyResetKey]: todayUtcDate() }
    }

    // 5) 逐抽 (10 连最后一抽保底, 或 dailyFirst 时的最后一抽保底)
    const stones: HeroStone[] = []
    for (let i = 0; i < count; i++) {
      const isLastSlot = i === count - 1
      // 保底条件:
      //   (a) 每次十连的最后一张 (仅 baili 的 tenPullGuaranteedStar 生效)
      //   (b) 每日首次十连的最后一张 (所有 dailyResetKey 池子)
      const guaranteedStar =
        (isLastSlot && count === 10 && (cfg.tenPullGuaranteedStar > 0 || usedDailyFirst))
          ? (cfg.tenPullGuaranteedStar > 0
              ? cfg.tenPullGuaranteedStar
              : poolMaxStar(pool))
          : 0

      let star: 1 | 2 | 3 | 4 | 5
      if (guaranteedStar > 0) {
        star = guaranteedStar as 1 | 2 | 3 | 4 | 5
      } else {
        star = rollStar(cfg.starWeights)
      }
      const hero = rollHero(pool, star)
      stones.push({
        stoneId: randomUUID(),
        heroId: hero.id,
        starLevel: star,
        pool,
        acquiredAt: Date.now(),
      })
    }

    // 6) 写入存档
    await this.saveService.addHeroStones(userId, stones)

    return { success: true, stones, updatedGuarantee, remainingTickets }
  }
}

function poolMaxStar(pool: RecruitPool): 4 | 5 {
  if (pool === 'qianli') return 4
  return 5   // wanli
}