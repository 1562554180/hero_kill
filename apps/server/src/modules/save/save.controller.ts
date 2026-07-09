import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { SaveService } from './save.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('save')
export class SaveController {
  constructor(private saveService: SaveService) {}

  @Get()
  async getSave(@CurrentUserId() userId: string) {
    const save = await this.saveService.getSave(userId)
    return save // 可能为 null;前端引导 /register
  }

  @Post()
  async updateSave(@CurrentUserId() userId: string, @Body() update: any) {
    return this.saveService.updateSave(userId, update)
  }

  @Post('seed-debug')
  async seedDebug(@CurrentUserId() userId: string) {
    return this.saveService.seedDebugResources(userId)
  }
}
