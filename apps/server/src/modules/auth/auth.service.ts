import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { AccountDoc } from './account.schema'
import { SaveDoc } from '../save/save.schema'
import { SaveService } from '../save/save.service'

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AccountDoc.name) private accountModel: Model<AccountDoc>,
    private saveService: SaveService,
  ) {}

  async register(username: string, password: string) {
    if (!USERNAME_RE.test(username)) {
      throw new ConflictException('USERNAME_INVALID')
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new ConflictException('PASSWORD_TOO_SHORT')
    }
    const existing = await this.accountModel.findOne({ username }).exec()
    if (existing) throw new ConflictException('USERNAME_TAKEN')

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = randomUUID()
    await this.accountModel.create({ username, passwordHash, userId })
    await this.saveService.createSave(userId)

    return { userId, username }
  }

  async login(username: string, password: string) {
    const account = await this.accountModel.findOne({ username }).exec()
    if (!account) throw new UnauthorizedException('INVALID_CREDENTIALS')
    const ok = await bcrypt.compare(password, account.passwordHash)
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS')
    return { userId: account.userId, username: account.username }
  }

  async bindLegacySave(currentUserId: string, oldUserId: string) {
    if (!oldUserId || oldUserId === currentUserId) {
      throw new ConflictException('BIND_INVALID')
    }
    const oldSave = await this.saveService.getSave(oldUserId)
    if (!oldSave) throw new NotFoundException('LEGACY_SAVE_NOT_FOUND')
    const newSave = await this.saveService.getSave(currentUserId)
    if (!newSave) throw new NotFoundException('CURRENT_SAVE_NOT_FOUND')

    // 把旧存档的所有 user-data 字段拷到新存档(不复制 fields 创建时间戳等元数据)
    const fieldsToMigrate = [
      'mainCityLevel',
      'buildings',
      'heroes',
      'treasures',
      'materials',
      'heroStones',
      'dailyRecruitGuarantee',
      'treasurePiece',
      'stageProgress',
      'subDefMigrated',
    ]
    const patch: Record<string, any> = {}
    for (const f of fieldsToMigrate) {
      ;(patch as any)[f] = (oldSave as any)[f]
    }
    await (this.saveService as any).updateSave(currentUserId, patch)

    // 删除旧 SaveDoc
    await this.saveService.deleteByUserId(oldUserId)

    return {
      migrated: {
        heroes: Array.isArray(oldSave.heroes) ? oldSave.heroes.length : 0,
        treasures: Array.isArray(oldSave.treasures) ? oldSave.treasures.length : 0,
        heroStones: Array.isArray(oldSave.heroStones) ? oldSave.heroStones.length : 0,
        materials: Array.isArray(oldSave.materials) ? oldSave.materials.length : 0,
        treasurePieces: Array.isArray((oldSave as any).treasurePiece)
          ? (oldSave as any).treasurePiece.length
          : 0,
      },
    }
  }
}
