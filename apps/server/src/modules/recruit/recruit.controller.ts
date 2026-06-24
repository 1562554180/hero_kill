import { Controller, Post, Param, Body } from '@nestjs/common'
import { RecruitService } from './recruit.service'
import type { RecruitPool } from '@hero-legend/shared-types'

@Controller('recruit')
export class RecruitController {
  constructor(private recruitService: RecruitService) {}

  @Post('draw/:userId/:pool')
  async draw(
    @Param('userId') userId: string,
    @Param('pool') pool: RecruitPool,
    @Body() body: { count: 1 | 10 },
  ) {
    return this.recruitService.draw(userId, pool, body?.count ?? 1)
  }

  @Post('smelt/:userId')
  async smelt(
    @Param('userId') userId: string,
    @Body() body: { stoneIds: string[] },
  ) {
    return this.recruitService.smelt(userId, body?.stoneIds ?? [])
  }
}