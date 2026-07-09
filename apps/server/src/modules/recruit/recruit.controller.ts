import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common'
import { RecruitService } from './recruit.service'
import type { RecruitPool } from '@hero-legend/shared-types'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('recruit')
export class RecruitController {
  constructor(private recruitService: RecruitService) {}

  @Post('draw/:pool')
  async draw(
    @CurrentUserId() userId: string,
    @Param('pool') pool: RecruitPool,
    @Body() body: { count: 1 | 10 },
  ) {
    return this.recruitService.draw(userId, pool, body?.count ?? 1)
  }

  @Post('smelt')
  async smelt(
    @CurrentUserId() userId: string,
    @Body() body: { stoneIds: string[] },
  ) {
    return this.recruitService.smelt(userId, body?.stoneIds ?? [])
  }
}
