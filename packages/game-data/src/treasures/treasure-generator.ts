import type { Treasure, StageReward } from '@hero-legend/shared-types'
import { treasureDefinitions } from './treasure-definitions.js'

export function generateTreasureDrop(
  stageReward: StageReward,
  isBossBattle: boolean,
): Treasure | null {
  let dropChance = stageReward.treasureFragmentChance
  if (isBossBattle && stageReward.bossBonus) {
    dropChance = stageReward.bossBonus.treasureChance
  }

  if (Math.random() > dropChance) return null

  const def = treasureDefinitions[Math.floor(Math.random() * treasureDefinitions.length)]
  const triggerRate = def.type === 'main' ? 1.0 : def.baseTriggerRate

  const treasure: Treasure = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: def.name,
    type: def.type,
    sourceHeroId: def.sourceHeroId ?? undefined,
    skill: {
      id: def.sourceSkillId ?? def.id,
      name: def.name,
      type: 'passive',
      description: def.description,
    },
    triggerRate,
    starLevel: def.starLevel,
  }

  return treasure
}

export function generateInitialTreasures(): Treasure[] {
  const treasures: Treasure[] = []
  const mainDefs = treasureDefinitions.filter(d => d.type === 'main')
  const subDefs = treasureDefinitions.filter(d => d.type === 'sub')

  for (const def of mainDefs) {
    for (let i = 0; i < 2; i++) {
      treasures.push({
        id: `t-init-${def.id}-${i}`,
        name: def.name,
        type: 'main',
        sourceHeroId: def.sourceHeroId ?? undefined,
        skill: { id: def.sourceSkillId ?? def.id, name: def.name, type: 'passive', description: def.description },
        triggerRate: 1.0,
        starLevel: def.starLevel,
      })
    }
  }

  for (const def of subDefs) {
    for (let i = 0; i < 2; i++) {
      treasures.push({
        id: `t-init-${def.id}-${i}`,
        name: def.name,
        type: 'sub',
        sourceHeroId: def.sourceHeroId ?? undefined,
        skill: { id: def.sourceSkillId ?? def.id, name: def.name, type: 'passive', description: def.description },
        triggerRate: def.baseTriggerRate,
        starLevel: def.starLevel,
      })
    }
  }

  return treasures
}
