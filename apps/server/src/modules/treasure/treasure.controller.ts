import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common'
import { TreasureService } from './treasure.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('treasure')
export class TreasureController {
  constructor(private treasureService: TreasureService) {}

  @Post('upgrade/:treasureId')
  async upgrade(
    @CurrentUserId() userId: string,
    @Param('treasureId') treasureId: string,
    @Body() body: { luckyStones?: number },
  ) {
    return this.treasureService.upgrade(userId, treasureId, body.luckyStones ?? 0)
  }

  @Post('transfer-level')
  async transfer(
    @CurrentUserId() userId: string,
    @Body() body: { fromTreasureId: string; toTreasureId: string },
  ) {
    return this.treasureService.transferLevel(userId, body.fromTreasureId, body.toTreasureId)
  }

  @Post('decompose/:treasureId')
  async decompose(
    @CurrentUserId() userId: string,
    @Param('treasureId') treasureId: string,
  ) {
    return this.treasureService.decompose(userId, treasureId)
  }
}
