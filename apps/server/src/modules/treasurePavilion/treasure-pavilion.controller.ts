import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { TreasurePavilionService } from './treasure-pavilion.service'

@Controller('treasure-pavilion')
export class TreasurePavilionController {
  constructor(private svc: TreasurePavilionService) {}

  @Get('info/:userId')
  async info(@Param('userId') userId: string) {
    return this.svc.info(userId)
  }

  @Post('draw/:userId')
  async draw(
    @Param('userId') userId: string,
    @Body() body: { count: 1 | 10 },
  ) {
    return this.svc.draw(userId, body?.count ?? 1)
  }

  @Post('compose/:userId')
  async compose(
    @Param('userId') userId: string,
    @Body() body: { treasureId: string },
  ) {
    return this.svc.compose(userId, body?.treasureId ?? '')
  }

  @Post('exchange/:userId')
  async exchange(
    @Param('userId') userId: string,
    @Body() body: { treasureId: string },
  ) {
    return this.svc.exchange(userId, body?.treasureId ?? '')
  }
}
