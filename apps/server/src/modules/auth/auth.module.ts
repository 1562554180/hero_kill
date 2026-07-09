import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AccountDoc, AccountSchema } from './account.schema'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AccountDoc.name, schema: AccountSchema }]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, MongooseModule],
})
export class AuthModule {}