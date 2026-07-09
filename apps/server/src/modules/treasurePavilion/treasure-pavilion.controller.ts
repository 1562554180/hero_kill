import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { TreasurePavilionService } from './treasure-pavilion.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('treasure-pavilion')
export class TreasurePavilionController {
  constructor(private svc: TreasurePavilionService) {}

  @Get('info')
  async info(@CurrentUserId() userId: string) {
    return this.svc.info(userId)
  }

  @Post('draw')
  async draw(
    @CurrentUserId() userId: string,
    @Body() body: { count: 1 | 10 },
  ) {
    return this.svc.draw(userId, body?.count ?? 1)
  }

  @Post('compose')
  async compose(
    @CurrentUserId() userId: string,
    @Body() body: { treasureId: string },
  ) {
    return this.svc.compose(userId, body?.treasureId ?? '')
  }

  @Post('exchange')
  async exchange(
    @CurrentUserId() userId: string,
    @Body() body: { treasureId: string },
  ) {
    return this.svc.exchange(userId, body?.treasureId ?? '')
  }
}
