import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { HeroService } from './hero.service'
import { heroes, bossHeroes } from '@hero-legend/game-data'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('hero')
export class HeroController {
  constructor(private heroService: HeroService) {}

  @Get()
  getAllHeroes() {
    return { heroes, bossHeroes }
  }

  @Post('levelup/:instanceId')
  async levelUp(@CurrentUserId() userId: string, @Param('instanceId') instanceId: string, @Body() body: { growthAmount: number }) {
    return this.heroService.levelUp(userId, instanceId, body?.growthAmount ?? 100)
  }

  @Post('equip-treasure/:instanceId')
  async equipTreasure(
    @CurrentUserId() userId: string,
    @Param('instanceId') instanceId: string,
    @Body() body: { slotType: 'main' | 'sub'; slotIndex: number; treasureId: string },
  ) {
    return this.heroService.equipTreasure(userId, instanceId, body.slotType, body.slotIndex, body.treasureId)
  }

  @Post('unequip-treasure/:instanceId')
  async unequipTreasure(
    @CurrentUserId() userId: string,
    @Param('instanceId') instanceId: string,
    @Body() body: { slotType: 'main' | 'sub'; slotIndex: number },
  ) {
    return this.heroService.unequipTreasure(userId, instanceId, body.slotType, body.slotIndex)
  }

  @Post('use-stone/:stoneId')
  async useStone(@CurrentUserId() userId: string, @Param('stoneId') stoneId: string) {
    return this.heroService.useHeroStone(userId, stoneId)
  }

  @Post('banish/:instanceId')
  async banish(
    @CurrentUserId() userId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.heroService.banish(userId, instanceId)
  }
}
