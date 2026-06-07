import { Controller, Post, Body } from '@nestjs/common'
import { BattleService } from './battle.service'

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
}
