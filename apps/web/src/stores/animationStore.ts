import { create } from 'zustand'
import type { Card, EquipmentSlot } from '@hero-legend/shared-types'
import type { FlyingCard, FlyingStage } from '../components/FlyingCard'

export type DirectionalLine = {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  cardName: string
  createdAt: number
}

export type DamageFloater = {
  id: string
  heroId: string
  amount: number      // 正数=治疗, 负数=伤害, dodge/response-kill时忽略
  type: 'damage' | 'heal' | 'dodge' | 'response-kill'
  createdAt: number
}

interface AnimationState {
  flyingCards: FlyingCard[]
  directionalLines: DirectionalLine[]
  damageFloaters: DamageFloater[]

  _queueFlyingCard: (req: { card: Card; sourceType: 'hand' | 'equipment'; sourceRef?: string; targetType: 'discard' | 'equipment' | 'hand'; targetHeroId?: string; targetSlot?: EquipmentSlot; fromHeroId?: string; fromPos?: { x: number; y: number }; onComplete?: () => void }) => void
  removeFloater: (id: string) => void
  addDirectionalLines: (lines: DirectionalLine[]) => void
  removeDirectionalLines: (ids: string[]) => void
  pushFloater: (entry: { heroId: string; amount: number; type: 'damage' | 'heal' | 'dodge' | 'response-kill' }) => void
  reset: () => void
}

// 几何辅助 — 与 battleStore 中相同, 内联以解耦
const rectCenter = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

const findCenterPos = (): { x: number; y: number } => {
  const el = document.querySelector('[data-center-marker]') as HTMLElement | null
  if (el) {
    const c = rectCenter(el.getBoundingClientRect())
    return { x: c.x, y: c.y - 50 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 }
}

const findSourcePos = (heroId: string, sourceType: 'hand' | 'equipment', ref: string | undefined): { x: number; y: number } | null => {
  if (sourceType === 'hand') {
    if (ref) {
      const el = document.querySelector(`[data-card-id="${ref}"]`) as HTMLElement | null
      if (el) return rectCenter(el.getBoundingClientRect())
    }
    const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  } else {
    const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    const slotEl = heroEl?.querySelector(`[data-equip-slot="${ref}"]`) as HTMLElement | null
    if (slotEl) return rectCenter(slotEl.getBoundingClientRect())
  }
  return null
}

const findHandPos = (heroId: string): { x: number; y: number } | null => {
  const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
  if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  return null
}

const AGGREGATE_WINDOW_MS = 120

export const useAnimationStore = create<AnimationState>((set, get) => ({
  flyingCards: [],
  directionalLines: [],
  damageFloaters: [],

  _queueFlyingCard: (req) => {
    const fromHeroId = req.fromHeroId ?? ''
    const from = req.fromPos ?? findSourcePos(fromHeroId, req.sourceType, req.sourceRef)
    if (!from) return
    const center = findCenterPos()
    let stages: FlyingStage[]
    if (req.targetType === 'discard') {
      stages = [
        { from, to: center, durationMs: 500 },
        { from: center, to: center, durationMs: 1000, endScale: 0.3, endOpacity: 0 },
      ]
    } else if (req.targetType === 'equipment' && req.targetSlot) {
      const equipPos = (() => {
        const heroEl = document.querySelector(`[data-hero-id="${req.targetHeroId}"]`) as HTMLElement | null
        const slotEl = heroEl?.querySelector(`[data-equip-slot="${req.targetSlot}"]`) as HTMLElement | null
        return slotEl ? rectCenter(slotEl.getBoundingClientRect()) : center
      })()
      stages = [
        { from, to: center, durationMs: 300 },
        { from: center, to: center, durationMs: 300 },
        { from: center, to: equipPos, durationMs: 500, endScale: 0.3, endOpacity: 0 },
      ]
    } else if (req.targetType === 'hand' && req.targetHeroId) {
      const handPos = findHandPos(req.targetHeroId) ?? center
      stages = [
        { from, to: center, durationMs: 300 },
        { from: center, to: center, durationMs: 300 },
        { from: center, to: handPos, durationMs: 500, endScale: 0.3, endOpacity: 0 },
      ]
    } else {
      stages = [
        { from, to: center, durationMs: 500 },
        { from: center, to: center, durationMs: 1000, endScale: 0.3, endOpacity: 0 },
      ]
    }
    const id = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set(s => ({
      flyingCards: [...s.flyingCards, { id, card: req.card, stages, onDone: () => {
        set(cur => ({ flyingCards: cur.flyingCards.filter(fc => fc.id !== id) }))
        req.onComplete?.()
      }}],
    }))
  },

  removeFloater: (id: string) => set(s => ({
    damageFloaters: s.damageFloaters.filter(f => f.id !== id),
  })),

  addDirectionalLines: (lines) => set(s => ({
    directionalLines: [...s.directionalLines, ...lines],
  })),

  removeDirectionalLines: (ids) => set(s => ({
    directionalLines: s.directionalLines.filter(l => !ids.includes(l.id)),
  })),

  pushFloater: (entry) => {
    const now = Date.now()
    set(s => {
      const existing = s.damageFloaters.find(
        f => f.heroId === entry.heroId
          && f.type === entry.type
          && now - f.createdAt < AGGREGATE_WINDOW_MS
      )
      if (existing) {
        return {
          damageFloaters: s.damageFloaters.map(f =>
            f.id === existing.id ? { ...f, amount: f.amount + entry.amount, createdAt: now } : f
          ),
        }
      }
      return {
        damageFloaters: [
          ...s.damageFloaters,
          { id: `${now}-${Math.random().toString(36).slice(2, 6)}`, createdAt: now, ...entry },
        ],
      }
    })
  },

  reset: () => set({ flyingCards: [], directionalLines: [], damageFloaters: [] }),
}))
