/**
 * 阶段 3 步骤 E: 主线程对 Worker 的异步包装.
 *
 * 暴露给 battleStore:
 *   - start(config): 创建 Worker, 启动引擎, 等到 done/error 才 resolve
 *   - action(name, args): 异步调 engine 方法 (返回值类型在 EngineMethodReturnMap)
 *   - on(eventType, handler): 订阅从 Worker 转发来的 EventBus 事件
 *   - setHandler(name, impl): 注入主线程 handler 实现 (Worker 调 handler-call 时 dispatch)
 *   - dispose(): terminate Worker
 *
 * Worker URL 用 new URL(..., import.meta.url) — Vite 原生支持.
 */
import type { GameEvent, GameEventType, BattleResult } from '@hero-legend/shared-types'
import type { DerivedSnapshot } from '@hero-legend/game-engine'
import type {
  MainMessage, WorkerMessage, HandlerName, HandlerCtx,
  EngineMethodName, EngineMethodArgsMap, EngineMethodReturnMap,
  SerializedGameConfig, WorkerSnapshot,
} from './protocol.js'
import { ALL_EVENT_TYPES } from './protocol.js'

type EventHandler = (event: GameEvent) => void
type HandlerImpl = (ctx: HandlerCtx) => Promise<unknown> | unknown

export class EngineProxy {
  private worker: Worker
  private eventHandlers = new Map<GameEventType, Set<EventHandler>>()
  private handlerImpls = new Map<HandlerName, HandlerImpl>()
  private startResolve: ((r: BattleResult) => void) | null = null
  private startReject: ((e: Error) => void) | null = null
  private actionResolvers = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private nextActionId = 1
  /** 最近一次 Worker snapshot (供 handler 实现内部读取, 替代 game.getState) */
  latestSnapshot: WorkerSnapshot | null = null
  /** snapshot 变化回调 (battleStore 同步 latestSnapshot + setState 用) */
  onSnapshot: ((snap: WorkerSnapshot) => void) | null = null
  private disposed = false

  constructor() {
    this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
    this.worker.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
      this.handleMessage(e.data)
    })
    this.worker.addEventListener('error', (e) => {
      if (this.startReject) {
        this.startReject(new Error(e.message || 'worker error'))
        this.startReject = null
        this.startResolve = null
      }
    })
  }

  /** 启动 engine — 主线程注入 handler 实现 + 订阅 EventBus, 然后 await done/error */
  async start(config: SerializedGameConfig): Promise<BattleResult> {
    return new Promise<BattleResult>((resolve, reject) => {
      this.startResolve = resolve
      this.startReject = reject
      const msg: MainMessage = { kind: 'start', config }
      this.worker.postMessage(msg)
    })
  }

  /** 异步调 engine 方法 */
  action<K extends EngineMethodName>(name: K, ...args: EngineMethodArgsMap[K]): Promise<EngineMethodReturnMap[K]> {
    const id = this.nextActionId++
    const msg: MainMessage = { kind: 'action', id, name, args: args as EngineMethodArgsMap[EngineMethodName] }
    return new Promise<EngineMethodReturnMap[K]>((resolve, reject) => {
      this.actionResolvers.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      })
      this.worker.postMessage(msg)
    })
  }

  /** 订阅 engine EventBus (转发) */
  on(eventType: GameEventType, handler: EventHandler): () => void {
    let set = this.eventHandlers.get(eventType)
    if (!set) {
      set = new Set()
      this.eventHandlers.set(eventType, set)
    }
    set.add(handler)
    return () => set?.delete(handler)
  }

  /** 注入主线程 handler 实现 (engine 在 Worker await handler 时被 forward 到这里) */
  setHandler(name: HandlerName, impl: HandlerImpl): void {
    this.handlerImpls.set(name, impl)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    try {
      this.worker.postMessage({ kind: 'terminate' } satisfies MainMessage)
    } catch {
      // noop
    }
    this.worker.terminate()
    this.eventHandlers.clear()
    this.handlerImpls.clear()
    this.actionResolvers.clear()
    this.startResolve = null
    this.startReject = null
  }

  private async handleMessage(msg: WorkerMessage): Promise<void> {
    if (!msg) return
    switch (msg.kind) {
      case 'event': {
        this.latestSnapshot = msg.snapshot
        this.onSnapshot?.(msg.snapshot)
        const set = this.eventHandlers.get(msg.event.type)
        if (set) {
          for (const h of set) {
            try { h(msg.event) } catch (e) { console.error('[engineProxy] event handler error', e) }
          }
        }
        return
      }
      case 'handler-call': {
        const impl = this.handlerImpls.get(msg.name)
        if (!impl) {
          // 没有 impl: 默认 resolve undefined/null/false 等中性值
          console.warn(`[engineProxy] no handler impl for ${msg.name}`)
          const resp: MainMessage = { kind: 'handler-response', id: msg.id, result: null }
          this.worker.postMessage(resp)
          return
        }
        try {
          const result = await impl(msg.ctx)
          const resp: MainMessage = { kind: 'handler-response', id: msg.id, result }
          this.worker.postMessage(resp)
        } catch (e) {
          console.error(`[engineProxy] handler ${msg.name} threw`, e)
          const resp: MainMessage = { kind: 'handler-response', id: msg.id, result: null }
          this.worker.postMessage(resp)
        }
        return
      }
      case 'done': {
        this.latestSnapshot = msg.snapshot
        this.onSnapshot?.(msg.snapshot)
        if (this.startResolve) {
          this.startResolve(msg.result)
          this.startResolve = null
          this.startReject = null
        }
        return
      }
      case 'action-done': {
        const r = this.actionResolvers.get(msg.id)
        if (r) {
          this.actionResolvers.delete(msg.id)
          r.resolve(msg.result)
        }
        return
      }
      case 'action-error': {
        const r = this.actionResolvers.get(msg.id)
        if (r) {
          this.actionResolvers.delete(msg.id)
          r.reject(new Error(msg.message + (msg.stack ? `\n${msg.stack}` : '')))
        }
        return
      }
      case 'error': {
        const err = new Error(msg.message + (msg.stack ? `\n${msg.stack}` : ''))
        if (this.startReject) {
          this.startReject(err)
          this.startResolve = null
          this.startReject = null
        } else {
          console.error('[engineProxy] worker error', err)
        }
        return
      }
    }
  }
}

export { ALL_EVENT_TYPES }
export type { DerivedSnapshot }
