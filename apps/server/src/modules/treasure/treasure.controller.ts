import { Controller, Post, Param, Body } from '@nestjs/common'
import { TreasureService } from './treasure.service'

@Controller('treasure')
export class TreasureController {
  constructor(private treasureService: TreasureService) {}

  @Post('upgrade/:userId/:treasureId')
  async upgrade(
    @Param('userId') userId: string,
    @Param('treasureId') treasureId: string,
    @Body() body: { luckyStones?: number },
  ) {
    return this.treasureService.upgrade(userId, treasureId, body.luckyStones ?? 0)
  }

  @Post('transfer-level/:userId')
  async transfer(
    @Param('userId') userId: string,
    @Body() body: { fromTreasureId: string; toTreasureId: string },
  ) {
    return this.treasureService.transferLevel(userId, body.fromTreasureId, body.toTreasureId)
  }
}
