# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

英雄传奇 (Hero Legend) — a web-based card battle game modeled after 英雄杀/英雄传奇. Players build hero teams, equip treasures (主印/辅印), and battle through stage-based campaigns. The game engine runs client-side with async `playerActionHandler` callbacks for interactive play.

## Build & Dev Commands

```bash
# Install
pnpm install

# Build all packages (run this after changing packages/* code)
pnpm build

# Build a single package
npx turbo build --filter=@hero-legend/game-data

# Dev servers (run both; backend needs MongoDB on localhost:27017)
pnpm --filter @hero-legend/server dev    # NestJS on :3000
pnpm --filter @hero-legend/web dev       # Vite on :5173

# Tests (game-engine only, vitest)
pnpm --filter @hero-legend/game-engine test
pnpm --filter @hero-legend/game-engine test:watch

# Type-check only
pnpm --filter @hero-legend/game-engine lint
```

## Architecture

**pnpm monorepo + Turborepo.** Packages must build before apps can use them.

```
shared-types  ←  game-data  ←  game-engine  ←  ai-engine
     ↑                ↑             ↑                 ↑
     └──── server (all 4) ─────────┘    web (first 3 only)
```

### Packages

| Package | Purpose |
|---------|---------|
| `shared-types` | All TypeScript interfaces: `Hero`, `Card`, `Skill`, `Treasure`, `GameState`, `BattleResult`, `GameEventType`, etc. |
| `game-data` | Static data: hero definitions, card decks, stage definitions, treasure definitions + generator. Pure data, no logic. |
| `game-engine` | Core game logic: `Game`, `Player`, `CardDeck`, `EventBus`, phases, rules, skill execution. Pure logic, no I/O. |
| `ai-engine` | AI decision-making for enemy heroes. Evaluates cards/threats and picks actions. |

### Apps

| App | Stack | Key |
|-----|-------|-----|
| `server` | NestJS + MongoDB (mongoose) | REST API at `:3000`. Modules: battle, hero, stage, save. MongoDB `hero-legend` db on `localhost:27017`. |
| `web` | React 19 + Vite + Zustand | SPA at `:5173`. Proxies `/api/*` → `localhost:3000` (strips `/api` prefix). |

### Battle Flow (Critical Architecture)

The game engine runs **entirely in the browser**. No WebSocket needed.

1. `BattlePage` creates a `Game` instance with a `playerActionHandler` callback
2. `playerActionHandler` returns a `Promise<GameAction>` — the engine awaits it during the play phase
3. `battleStore` (Zustand) stores the pending Promise; UI clicks (play card, select target, end turn) resolve it
4. `EventBus` events are subscribed individually (no wildcard support) and rendered as battle log entries
5. After battle ends, result is POSTed to `/api/battle/result`

### Data: Treasures (宝具)

- **主印 (main)**: Always trigger (100%). Star levels: 5★, 4★, 3★. Defined in `treasure-definitions.ts` with `starLevel` field.
- **辅印 (sub)**: 30% trigger rate. Categorized: 攻击/防御/锦囊. Has `category` field on definition.
- Heroes have treasure slots based on star level (see `getTreasureSlots()` in shared-types).
- Initial save gets 2 of each treasure via `generateInitialTreasures()`.

### Frontend State

- `gameStore` (Zustand): Save data, hero roster, materials
- `battleStore` (Zustand): Active game instance, hand cards, battle log, action resolution

## Conventions

- All game content (card names, hero names, descriptions) is in Chinese
- Package entry points: `main: "./dist/index.js"`, `types: "./dist/index.d.ts"` — always build before running
- Server API routes have no prefix; Vite proxy strips `/api` from frontend requests
- Import `.js` extensions in TypeScript (e.g., `import { X } from './module.js'`) — required by ESM
- `null` in treasure definitions (sourceHeroId/sourceSkillId) maps to `undefined` in Treasure interface via `?? undefined`
