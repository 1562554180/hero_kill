import type { PhaseType } from '@hero-legend/shared-types'

export interface PhaseResult {
  completed: boolean
  actions: PhaseAction[]
}

export interface PhaseAction {
  type: string
  data: Record<string, unknown>
}

export abstract class Phase {
  abstract readonly type: PhaseType
  abstract execute(context: PhaseContext): Promise<PhaseResult>
}

export interface PhaseContext {
  // Will be defined after Game.ts
  [key: string]: unknown
}
