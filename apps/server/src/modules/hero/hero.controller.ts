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

  @Post('recruit/:userId/:heroId')
  async recruitHero(@Param('userId') userId: string, @Param('heroId') heroId: string) {
    return this.heroService.recruitHero(userId, heroId)
  }

  @Post('levelup/:userId/:heroId')
  async levelUp(@Param('userId') userId: string, @Param('heroId') heroId: string, @Body() body: { growthAmount: number }) {
    return this.heroService.levelUp(userId, heroId, body.growthAmount ?? 100)
  }

  @Post('upgrade-star/:userId/:heroId')
  async upgradeStar(@Param('userId') userId: string, @Param('heroId') heroId: string) {
    return this.heroService.upgradeStar(userId, heroId)
  }

  @Post('equip-treasure/:userId/:heroId')
  async equipTreasure(
    @Param('userId') userId: string,
    @Param('heroId') heroId: string,
    @Body() body: { slotType: 'main' | 'sub'; slotIndex: number; treasureId: string },
  ) {
    return this.heroService.equipTreasure(userId, heroId, body.slotType, body.slotIndex, body.treasureId)
  }

  @Post('unequip-treasure/:userId/:heroId')
  async unequipTreasure(
    @Param('userId') userId: string,
    @Param('heroId') heroId: string,
    @Body() body: { slotType: 'main' | 'sub'; slotIndex: number },
  ) {
    return this.heroService.unequipTreasure(userId, heroId, body.slotType, body.slotIndex)
  }

  @Post('smelt/:userId')
  async smeltHeroes(@Param('userId') userId: string, @Body() body: { heroIds: string[] }) {
    return this.heroService.smeltHeroes(userId, body.heroIds)
  }
}
