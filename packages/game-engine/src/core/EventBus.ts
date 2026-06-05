import type { GameEventType, GameEvent } from '@hero-legend/shared-types'

type EventHandler = (event: GameEvent) => void

export class EventBus {
  private handlers: Map<GameEventType, Set<EventHandler>> = new Map()
  private history: GameEvent[] = []

  on(eventType: GameEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    return () => this.handlers.get(eventType)?.delete(handler)
  }

  emit(event: Omit<GameEvent, 'timestamp'>): void {
    const fullEvent: GameEvent = { ...event, timestamp: Date.now() }
    this.history.push(fullEvent)
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        handler(fullEvent)
      }
    }
  }

  getHistory(): GameEvent[] {
    return [...this.history]
  }

  clear(): void {
    this.handlers.clear()
    this.history = []
  }
}
