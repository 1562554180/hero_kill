import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { HeroService } from './hero.service'
import { heroes, bossHeroes } from '@hero-legend/game-data'

@Controller('hero')
export class HeroController {
  constructor(private heroService: HeroService) {}

  @Get()
  getAllHeroes() {
    return { heroes, bossHeroes }
  }

  @Post('levelup/:userId/:instanceId')
  async levelUp(@Param('userId') userId: string, @Param('instanceId') instanceId: string, @Body() body: { growthAmount: number }) {
    return this.heroService.levelUp(userId, instanceId, body?.growthAmount ?? 100)
  }

  @Post('equip-treasure/:userId/:instanceId')
  async equipTreasure(
    @Param('userId') userId: string,
    @Param('instanceId') instanceId: string,
    @Body() body: { slotType: 'main' | 'sub'; slotIndex: number; treasureId: string },
  ) {
    return this.heroService.equipTreasure(userId, instanceId, body.slotType, body.slotIndex, body.treasureId)
  }

  @Post('unequip-treasure/:userId/:instanceId')
  async unequipTreasure(
    @Param('userId') userId: string,
    @Param('instanceId') instanceId: string,
    @Body() body: { slotType: 'main' | 'sub'; slotIndex: number },
  ) {
    return this.heroService.unequipTreasure(userId, instanceId, body.slotType, body.slotIndex)
  }

  @Post('use-stone/:userId/:stoneId')
  async useStone(@Param('userId') userId: string, @Param('stoneId') stoneId: string) {
    return this.heroService.useHeroStone(userId, stoneId)
  }

  @Post('banish/:userId/:instanceId')
  async banish(
    @Param('userId') userId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.heroService.banish(userId, instanceId)
  }
}