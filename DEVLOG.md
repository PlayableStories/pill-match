# Pill Match Game — Development Log

**Project:** candy-game (prescription-themed Match-3)
**Date started:** 2026-05-05
**Stack:** Phaser 4.0.0 · TypeScript 5.7.2 · Vite 6.3.1
**Canvas:** 1024 × 768, type AUTO (WebGL preferred)
**Entry:** src/main.ts → src/game/main.ts → Boot → Preloader → MainMenu → Game → GameOver

## Game Concept

A Match-3 puzzle game where the player follows a **prescription**. At the start (and after each completed prescription), a semi-transparent dialog appears showing 1–3 colored pills in a required order along with a short message (e.g. "Good morning, this is your morning dose."). The player must eliminate pills by making matches — but only the currently required color can be eliminated. Other color matches cause the swap to reverse with no effect. Completing a full prescription sequence triggers the next dialog and prescription.

**Pill colors (PillType index → color):**
- 0 = red
- 1 = orange
- 2 = yellow
- 3 = green
- 4 = blue
- 5 = purple

**Grid:** 8 × 8, cell size 70 px, top-left at (232, 130), center at (512, 410)

**Scoring:** `validMatches.length × 10 × chainMultiplier`. Chain multiplier increments per cascade within one turn.

**Moves:** 30 per game. Only decremented on a valid (required-color matched) swap. Game over at 0.

---

## File Log

---

## [CREATED] DEVLOG.md — 2026-05-05

**Why:** Persistent reference log so any future AI agent can reconstruct or extend the game without relying on conversation history.

**Key details:**
- Updated after each file is created or meaningfully changed
- Each entry records: why, key implementation details, dependencies, gotchas

**Dependencies:** none — standalone documentation file

**Gotchas / decisions:** n/a

---

## [CREATED] src/game/config/prescriptions.ts — 2026-05-05

**Why:** Central config for all prescription pop-up combinations. Designed to be edited without touching game logic.

**Key details:**
- Exports `Prescription` interface: `{ message: string, pills: [PillType, ...PillType[]] }`
- Exports `PRESCRIPTIONS: Prescription[]` array — add/edit/reorder entries here
- `pills` array length must be 1–3; no runtime validation — keep valid manually
- Game uses `prescriptionIndex % PRESCRIPTIONS.length` so the list loops infinitely
- PillType values: 0=red, 1=orange, 2=yellow, 3=green, 4=blue, 5=purple
- All messages are placeholders — replace with real copy when available

**Dependencies:** imports `PillType` from `../types`; imported by `src/game/scenes/Game.ts`

**Gotchas / decisions:** Kept as `.ts` (not `.json`) so it gets full type checking on the `pills` array.

---

## [CREATED] src/game/types.ts — 2026-05-05

**Why:** Single source of truth for all shared TypeScript interfaces used across PillGrid, Game, and GameOver scenes.

**Key details:**
- `PillType = 0 | 1 | 2 | 3 | 4 | 5` — literal union, not enum, for simplicity
- `PillCell.row` and `PillCell.col` are mutable and kept in sync with the logical grid position at all times; the `pointerdown` handler on the sprite reads them live
- `GamePhase` union covers: dialog, idle, selected, swapping, checking, popping, falling, cascading, gameover
- `PrescriptionState` tracks `prescriptionIndex` (wraps with `%`) and `stepIndex` (resets per prescription)
- `GameOverData` passed as second arg to `this.scene.start('GameOver', data)`; received in `GameOver.init(data)`

**Dependencies:** no imports; imported by PillGrid.ts, PillTextures.ts, Game.ts, GameOver.ts, config/prescriptions.ts

**Gotchas / decisions:** `matched` flag on PillCell is a scratch field reset after each pop cycle — not persistent state.

---

## [CREATED] src/game/PillTextures.ts — 2026-05-05

**Why:** No external art assets; all pill visuals are drawn programmatically so the project has zero image dependencies.

**Key details:**
- Uses `scene.textures.createCanvas(key, 64, 64)` → Canvas 2D API → `tex.refresh()` to upload to WebGL
- IMPORTANT: use `tex.refresh()` NOT `tex.update()` — refresh uploads pixels to GPU; update only rebuilds JS-side ImageData
- Draws a horizontal ellipse (capsule shape: rx=30, ry=20) for pill silhouette
- Linear gradient overlay for highlight from top edge to center (lighter color fading to transparent)
- Horizontal dividing line at center y = pill seam visual detail
- Guards with `scene.textures.exists(key)` — textures live on the global TextureManager, not per-scene; survive scene restarts
- Produces textures named `pill_0` through `pill_5`
- `PILL_TEXTURE_SIZE = 64` exported constant

**Dependencies:** imports `Scene` from phaser; called from `Preloader.create()`

**Gotchas / decisions:** Uses `ctx.ellipse()` for the capsule shape — `fillRoundedRect` is not a native Canvas 2D API method.

---

## [MODIFIED] src/game/scenes/Preloader.ts — 2026-05-05

**Why:** Needs to generate pill textures before any game scene starts.

**Key details:**
- Added `import { generatePillTextures } from '../PillTextures'`
- `create()` now calls `generatePillTextures(this)` before `this.scene.start('MainMenu')`
- Must run in `create()` not `preload()` — `textures.createCanvas` needs the renderer ready, guaranteed by `create()`

**Dependencies:** imports generatePillTextures from PillTextures.ts

**Gotchas / decisions:** n/a

---

## [CREATED] src/game/PillGrid.ts — 2026-05-05

**Why:** Encapsulates all grid logic (data + sprite management) so Game.ts stays focused on state machine and UI.

**Key details:**
- Exports: `PillGrid` class, `FallItem` interface, constants `GRID_ROWS/COLS/CELL_SIZE/ORIGIN_X/ORIGIN_Y`, `cellToWorld(row,col)`
- Grid: 8×8, cell 70px, top-left (232,130), center (512,410)
- `populate()`: rejection-sampling loop ensures no initial 3-in-a-row/column matches
- Each sprite: `.setInteractive()` + `on('pointerdown', () => onCellClick(cell.row, cell.col))` — reads `cell.row/col` live (updated during gravity)
- `findMatches()`: run-length scan horizontal + vertical; `Set<"r,c">` deduplicates; returns ALL colors (Game filters to required color)
- `applyGravity()`: per-column bottom-to-top scan, slides cells into empty slots, delay = `(destRow - srcRow) * 20ms`
- `refill()`: per-column top-to-bottom, spawns new pills above viewport at `y = GRID_ORIGIN_Y - (spawnCount+1) * CELL_SIZE`
- `destroy()`: called on scene shutdown via `this.events.on('shutdown', ...)` in Game.create()

**Dependencies:** imports Scene from phaser, PillType/PillCell/Grid from types.ts; imported by Game.ts

**Gotchas / decisions:** `spawnCellAt` sets `cell.row = 0` as placeholder — caller (refill) sets correct `row`/`col` immediately after.

---

## [REWRITTEN] src/game/scenes/Game.ts — 2026-05-05

**Why:** Core game scene — full Match-3 implementation with prescription system, state machine, and all tweens.

**Key details:**
- State machine phases: dialog → idle → selected → swapping → checking → popping → falling → cascading → gameover
- `pendingDialog` flag: set in `advancePrescription()` when prescription completes; checked in `onFallComplete()` after cascades settle
- `executeSwap()`: tweens both sprites simultaneously; shared `tweensDone` counter fires logic at count=2; data swap committed AFTER tween; if no valid required-color match → reverses swap with tween + data undo (move NOT deducted)
- `processMatches()`: scores, marks cells, calls `advancePrescription()`, pops, gravity+refill, `updatePillHighlights()`
- `updatePillHighlights()`: required color pills alpha=1.0, others alpha=0.35
- Prescription dialog: Container at depth 100, rebuilt per showing; semi-transparent black rounded rect bg, message text, pill icons + arrows, OK button; fades in/out
- Required-color indicator: small `pill_N` sprite in top UI showing current target
- `INITIAL_MOVES = 30`; decremented only on valid swap

**Dependencies:** imports PillGrid, types, PRESCRIPTIONS; used by main.ts scene array

**Gotchas / decisions:**
- Do NOT add `this.input.on('pointerdown')` in Game — doubles with sprite listeners
- `dialogContainer` is destroyed and rebuilt each `showPrescriptionDialog()` call
- `animatePop` / `animateFall` use shared decrement-to-zero counter to call `onDone` exactly once

---

## [UPDATED] src/game/scenes/GameOver.ts — 2026-05-05

**Why:** Displays final score from Game scene, offers Play Again and Main Menu navigation.

**Key details:**
- `init(data: Partial<GameOverData>)` receives score and movesUsed via `scene.start('GameOver', data)`
- `scene.start('Game')` (no data) re-creates Game from scratch — Game.create() always re-initializes state fully
- Button hover: color changes on pointerover/pointerout, cursor changes via `useHandCursor: true`
- `data` typed as `Partial<GameOverData>` with `?? 0` fallbacks for direct navigation safety

**Dependencies:** imports GameOverData from types.ts

---
