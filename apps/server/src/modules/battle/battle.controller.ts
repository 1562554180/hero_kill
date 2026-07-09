import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { BattleService } from './battle.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('battle')
export class BattleController {
  constructor(private battleService: BattleService) {}

  @Post('start')
  async startBattle(@Body() body: {
    playerHeroId: string
    playerInstance: any
    allyHeroIds: string[]
    enemyHeroIds: string[]
  }) {
    return this.battleService.startBattle(body)
  }

  @Post('result')
  async saveResult(@CurrentUserId() userId: string, @Body() body: {
    stageId: string
    battleIdx: number
    result: any
    playerHeroId?: string
  }) {
    return this.battleService.saveResult({ ...body, userId })
  }
}
