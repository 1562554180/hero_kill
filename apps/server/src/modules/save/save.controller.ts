import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { SaveService } from './save.service'

@Controller('save')
export class SaveController {
  constructor(private saveService: SaveService) {}

  @Get(':userId')
  async getSave(@Param('userId') userId: string) {
    let save = await this.saveService.getSave(userId)
    if (!save) {
      save = await this.saveService.createSave(userId)
    }
    return save
  }

  @Post(':userId')
  async updateSave(@Param('userId') userId: string, @Body() update: any) {
    return this.saveService.updateSave(userId, update)
  }
}
