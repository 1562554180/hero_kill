# 伤害/状态反馈层 Spec

**日期**: 2026-06-30
**会话**: 英雄杀风格改造 — 子项目 B（伤害/状态反馈层）
**状态**: 设计已确认, 待用户审阅后进入实施规划

## 目标

为英雄传奇加入英雄杀风格的伤害与状态反馈层, 让玩家一眼看清"谁受了多少伤 / 谁回了多少血 / 谁濒死 / 谁阵亡". 包含四个视觉元素:

1. **飘字** — 武将位置飘出红字伤害 / 绿字治疗, 600ms 上升淡出
2. **边框红闪** — 受击瞬间武将牌边框短暂变红 (~150ms)
3. **血条平滑过渡** — 损失/回复的血格 0.3s 颜色过渡
4. **濒死红边脉动** — hp=0 未死亡时武将牌红边 1s 脉冲; 死亡保持现有阵亡灰度

## 背景

参考:
- **英雄杀** (百度百科 / 抖音实战素材 / 商业卡牌手游课程): 飘字 + 武将震动 + 血条动画 + 阶段横幅是商业卡牌游戏标准反馈层.
- 此前对比表 (`chat 2026-06-30 三国杀/英雄杀/我们项目对比`) 标记本模块为 🔴 P0 重大缺口.

现有动画:
- **飞牌动画** (`FlyingCardOverlay`, zIndex 2000): 与本任务无关.
- **指向线** (`DirectionalLineOverlay`, zIndex 1500): 与本任务无关.
- **判定区** (`fuse-flame` / `lock-toggle`): 与本任务无关.
- **EventBus** (`battleStore.ts:1369`): 引擎已发出 `damage:deal` / `damage:receive` / `heal` / `dying` / `die` 事件, payload 含 `data.damage` / `data.amount` / `sourceHeroId` / `targetHeroId`. 无 `critical` 字段.
- **`findHeroCenter(heroId)`** (`battleStore.ts:344`): 已存在, 飘字定位直接复用.
- **`HeroBattleCard`** (`apps/web/src/components/HeroBattleCard.tsx`, 447 行): 当前 HP 显示为数字徽章 (`:187`) + 格子血条 (`:196-202`), 死亡显示"阵亡"覆盖层 (`:367-373`). 零动画.

## 范围

### 包含

- 单/多段伤害合并为一次飘字 (120ms 聚合窗口内同目标同 type 合并 amount)
- 单次治疗独立飘字 (同样聚合窗口)
- 受击瞬间边框红闪 ~150ms
- 血格 `background-color` 0.3s 过渡
- 濒死 (currentHp === 0 且 isAlive) 红边 1s 脉冲
- 死亡 (currentHp <= 0 且 !isAlive) 灰度 + 50% 透明 + 阵亡 (已存在, 不变)
- 玩家 + AI 都触发
- Portal 到 body, zIndex 1700 (在 directional line 1500 之上, flying card 2000 之下)
- 飘字跟随武将 (RAF 轮询 `findHeroCenter`, 处理武将位置微动)

### 不包含

- 不做音效
- 不做粒子/纸片破碎 (经典英雄杀式只飘数字)
- 不做暴击特效 (引擎 payload 无 critical 字段)
- 不做技能图标叠加 (后续 P2 扩展)
- 不修改 game-engine 包 — 纯前端实现
- 不修改 Engine 的 event payload

## 数据流

### 触发链

```
engine emit 'damage:deal' | 'damage:receive' | 'heal'
  data: { damage: number } | { amount: number }
  sourceHeroId, targetHeroId
    ↓
battleStore 的事件 handler (battleStore.ts ~第 364-366)
    ↓ (扩展)
pushFloater({ heroId, amount, type })
    ↓
pushFloater 内做 120ms 聚合: 同 heroId+type 已有条目 → 合并 amount; 否则新建
    ↓
set({ damageFloaters: [...prev, newEntry] })
    ↓
React 重渲染
    ↓
DamageFloaterOverlay (portal to body, zIndex 1700)
    ↓
每个 <Floater>: RAF 轮询 findHeroCenter(entry.heroId) 更新 left/top
  CSS animation: damage-floater-rise 600ms forwards
  onAnimationEnd → removeFloater(id)
```

### 同时, 受击本地反馈

```
HeroBattleCard 组件
  useRef(prevHp) 记录上次 hp
  useEffect: currentHp 变化 → 若减少 → 临时挂 .hero-card-flash class (150ms 后移除)
            → 若 currentHp === 0 && isAlive → 挂 .hero-card-pulse class
            → 若 currentHp <= 0 && !isAlive → 挂 .hero-card-dead class (灰度覆盖)
  血格 div 加 transition: background-color 0.3s
```

## 状态切片

`battleStore` 新增:

```ts
type DamageFloater = {
  id: string          // 唯一 id (用于 filter)
  heroId: string      // 目标武将 id
  amount: number      // 正数=治疗, 负数=伤害
  type: 'damage' | 'heal'
  createdAt: number   // 创建时间戳 (聚合窗口判断用)
}

damageFloaters: DamageFloater[]  // 初始值 []
```

新增 action:
- `pushFloater(entry: Omit<id, createdAt>)`: 聚合窗口检查 + 入队
- `removeFloater(id: string)`: 飘字动画结束回调

## 组件结构

### 新增文件 1: `apps/web/src/components/DamageFloaterOverlay.tsx`

```tsx
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'

export function DamageFloaterOverlay() {
  const floaters = useBattleStore(s => s.damageFloaters)
  const remove = useBattleStore(s => s.removeFloater)
  return createPortal(
    <div data-floater-overlay style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1700 }}>
      {floaters.map(f => (
        <Floater key={f.id} entry={f} onDone={() => remove(f.id)} />
      ))}
    </div>,
    document.body
  )
}

function Floater({ entry, onDone }) {
  const [pos, setPos] = useState<{x:number,y:number}|null>(null)

  // 首次挂载定位
  useEffect(() => {
    const el = document.querySelector(`[data-hero-id="${entry.heroId}"]`) as HTMLElement | null
    if (el) {
      const r = el.getBoundingClientRect()
      setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
  }, [entry.heroId])

  // RAF 跟随 (武将位置可能在动画中变化)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = document.querySelector(`[data-hero-id="${entry.heroId}"]`) as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [entry.heroId])

  if (!pos) return null
  return (
    <div
      className={entry.type === 'heal' ? 'floater floater-heal' : 'floater floater-damage'}
      style={{ left: pos.x, top: pos.y - 40 }}
      onAnimationEnd={onDone}
    >
      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
    </div>
  )
}
```

### 新增 CSS: `apps/web/src/styles/global.css` 末尾追加

```css
/* 飘字 */
@keyframes damage-floater-rise {
  0%   { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
  20%  { opacity: 1; transform: translate(-50%, -8px) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -50px) scale(1); }
}
.floater {
  position: fixed;
  transform: translate(-50%, 0);
  font-size: 32px;
  font-weight: 900;
  text-shadow: 0 0 4px rgba(0,0,0,0.8), 2px 2px 0 #000;
  pointer-events: none;
  animation: damage-floater-rise 600ms ease-out forwards;
}
.floater-damage { color: #ff3333; }
.floater-heal   { color: #44dd66; }

/* 武将牌受击红闪 */
@keyframes hero-card-flash {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 50, 50, 0); }
  50%      { box-shadow: 0 0 24px rgba(255, 50, 50, 0.9); }
}
.hero-card-flash { animation: hero-card-flash 150ms ease-out; }

/* 濒死红边脉动 */
@keyframes hero-card-pulse {
  0%, 100% { border-color: #ff2222; box-shadow: 0 0 8px rgba(255, 34, 34, 0.5); }
  50%      { border-color: #ff6666; box-shadow: 0 0 20px rgba(255, 34, 34, 0.9); }
}
.hero-card-pulse { animation: hero-card-pulse 1s ease-in-out infinite; }

/* 血格过渡 */
.hp-cell {
  transition: background-color 0.3s ease-out;
}
```

### 修改文件 1: `apps/web/src/stores/battleStore.ts`

- 在初始 state (~第 281 行, `directionalLines` 旁) 加 `damageFloaters: []`
- 在 helper 区 (~第 344 行 `findHeroCenter` 旁) 加:
  ```ts
  const AGGREGATE_WINDOW_MS = 120

  const pushFloater = (entry: { heroId: string; amount: number; type: 'damage' | 'heal' }) => {
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
  }

  removeFloater: (id: string) => set(s => ({
    damageFloaters: s.damageFloaters.filter(f => f.id !== id),
  })),
  ```
- 在 damage/heal 事件 handler (battleStore.ts ~第 364-366 行) 内, 现有日志输出后, 加入 `pushFloater` 调用:
  ```ts
  case 'damage:deal':
  case 'damage:receive':
    if (event.targetHeroId) {
      const dmg = (event.data as any)?.damage ?? 0
      if (dmg > 0) pushFloater({ heroId: event.targetHeroId, amount: -dmg, type: 'damage' })
    }
    break
  case 'heal':
    if (event.targetHeroId) {
      const amt = (event.data as any)?.amount ?? 0
      if (amt > 0) pushFloater({ heroId: event.targetHeroId, amount: amt, type: 'heal' })
    }
    break
  ```
- 在 `_resetBattleState` (~第 668 行) 加 `damageFloaters: []`

### 修改文件 2: `apps/web/src/components/HeroBattleCard.tsx`

- 顶部加 import `useRef, useEffect`
- 加 `const prevHpRef = useRef(currentHp)` 与 `useEffect`:
  ```tsx
  useEffect(() => {
    const prev = prevHpRef.current
    if (currentHp < prev) {
      // 受击红闪: 临时挂 class
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 150)
      prevHpRef.current = currentHp
      return () => clearTimeout(t)
    }
    prevHpRef.current = currentHp
  }, [currentHp])
  ```
- 状态 `const [flash, setFlash] = useState(false)`
- 根 div className 拼接:
  - `currentHp === 0 && isAlive` → 加 `hero-card-pulse`
  - `flash` → 加 `hero-card-flash`
  - `currentHp <= 0 && !isAlive` → 保留现有灰度覆盖逻辑
- 血格 div (`:196-202`) 加 className `hp-cell`

预计改动 ~30 行.

### 修改文件 3: `apps/web/src/components/BattleBoard.tsx`

- 顶部 import 新增 `import { DamageFloaterOverlay } from './DamageFloaterOverlay'`
- 在 `<DirectionalLineOverlay />` 旁边 (~第 2106 行) 添加 `<DamageFloaterOverlay />`

预计改动 +2 行.

## 边缘情况

| 场景 | 行为 |
|------|------|
| 武将 DOM 不存在 | `findHeroCenter` 返回 null, 飘字不渲染 (但条目仍在 store, 1.2s 后自动 `removeFloater`) |
| 武将受伤瞬间位置变化 | RAF 轮询跟随, 飘字跟随武将移动 |
| 同一目标连续多段伤 (120ms 内) | 合并 amount, 单条飘字 (e.g. `-3` 而不是 `-1 -2`) |
| 治疗 + 伤害同时 (不同 type) | 不合并, 各自飘字 |
| 死亡后 (`!isAlive`) 仍被治疗 (桃救回) | 复活时 hp 从 0 → 1, 绿字飘字正常显示, 红边脉动停止 |
| 飘字动画期间武将离场 | RAF 找不到 DOM, 不更新 pos, 飘字停在最后已知位置完成动画 |
| 玩家/AI 同一回合多次互相伤害 | 每条事件独立飘字, 不合并 (跨回合/跨角色) |
| `data.damage === 0` 或未定义 | 不入队 (避免飘出 -0) |

## 文件改动清单

| 文件 | 类型 | 行数 |
|------|------|------|
| `apps/web/src/components/DamageFloaterOverlay.tsx` | 新建 | ~55 |
| `apps/web/src/styles/global.css` | 追加 | ~30 |
| `apps/web/src/stores/battleStore.ts` | 修改 | +35 |
| `apps/web/src/components/HeroBattleCard.tsx` | 修改 | +20 |
| `apps/web/src/components/BattleBoard.tsx` | 修改 | +2 |

总计 ~142 行. 零引擎改动.

## 验证

实施完成后手动测试:
1. 玩家对 AI 出杀命中 → AI 卡片边框红闪 150ms → 血格平滑过渡 → AI 位置飘红 "-1"
2. 玩家对自己出桃 → 玩家卡片血格恢复 + 飘绿 "+1"
3. AI 对玩家出杀命中 → 玩家卡片边框红闪 + 飘红 "-1"
4. 武将受到酒+杀连击 (1+1=2) → 合并飘 "-2" 单条
5. 武将 hp 被打到 0 → 进入濒死 → 红边 1s 持续脉动 (未死亡)
6. 濒死状态出桃救回 (hp 0→1) → 红边脉动停止, 飘绿 "+1"
7. 无人救濒死 → 触发 die 事件 → 武将变灰 + 阵亡覆盖 (已有逻辑)
8. AOE 多目标同时受伤 → 每个目标各自飘字, 互不干扰
9. 武将位置动画中 (例如死亡翻转) → 飘字跟随, 不脱节
10. 连续快速受击 → 聚合窗口生效, 不出现大量重叠飘字

## 不做 (YAGNI)

- 音效
- 暴击特效 (引擎 payload 无此字段)
- 技能图标叠加飘字 (后续 P2)
- 武将牌震动 (用户明确选择"只边框红闪、不震动")
- 暴击数字加大
- 飘字颜色按卡类型分
- 武将离场飘字取消
- resize/scroll 重定位 (RAF 跟随已处理)