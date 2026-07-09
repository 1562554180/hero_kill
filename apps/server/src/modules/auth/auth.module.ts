import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AccountDoc, AccountSchema } from './account.schema'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AccountDoc.name, schema: AccountSchema }]),
    SaveModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, MongooseModule],
})
export class AuthModule {}