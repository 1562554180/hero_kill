import { Module } from '@nestjs/common'
import { RecruitController } from './recruit.controller'
import { RecruitService } from './recruit.service'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [SaveModule],
  controllers: [RecruitController],
  providers: [RecruitService],
})
export class RecruitModule {}