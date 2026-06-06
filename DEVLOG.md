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

**Scoring:** Prescribed (required-color) pills score `count × 10 × chainMultiplier`; each overdose (wrong-color pill cleared) subtracts `OVERDOSE_PENALTY` (20). Score may go negative. Chain multiplier increments per cascade within one turn.

**Moves:** 60 per game (`INITIAL_MOVES`). Only decremented on a valid (required-color matched) swap. Game over at 0.

**Day structure:** 2 doses per day — Morning then Evening (`DOSES_PER_DAY = 2`). Prescriptions alternate morning (even index) / evening (odd index).

**Win / lose:** Survive `DAYS_TO_SURVIVE = 7` days (through Day 7 evening) with a positive score to win. Lose on negative score, a fatal overdose (overdoses ≥ 2× prescribed pills taken), or running out of moves.

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

# ═══════════════════════════════════════════════════════════════════════════
# Session 2 — 2026-06-06 (gameplay, menu, overdose system, release)
# ═══════════════════════════════════════════════════════════════════════════

## [MODIFIED] src/game/main.ts — 2026-06-06

**Why:** The fixed 1024×768 canvas was clipped off-screen when the browser window was resized smaller.

**Key details:**
- Imported `Scale` from phaser; added `scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH }` to the game config.
- FIT scales the entire 1024×768 design proportionally to fit the window (letterboxing as needed) and centers it. All hardcoded coordinates remain valid because FIT scales the whole rendered output, not the world.

**Dependencies:** pairs with the `#game-container` sizing in public/style.css.

**Gotchas / decisions:** FIT measures the parent element, so the parent must have a real size — see the style.css change. Chose FIT over ENVELOP to avoid cropping the play area.

---

## [MODIFIED] public/style.css — 2026-06-06

**Why:** Give Phaser's Scale Manager a real area to measure for FIT mode.

**Key details:** Added `#game-container { width: 100%; height: 100%; }` so the container fills `#app` instead of shrink-wrapping the canvas (a shrink-wrapped parent defeats FIT — the canvas can never shrink below its own size).

---

## [MODIFIED] src/game/scenes/Preloader.ts — 2026-06-06

**Why:** `create()` called `this.scene.start('Game')`, skipping the menu entirely — MainMenu was dead/unreachable code.

**Key details:** Changed to `this.scene.start('MainMenu')`. Scene flow is now Boot → Preloader → MainMenu → Game → GameOver as intended.

---

## [REWRITTEN] src/game/scenes/MainMenu.ts — 2026-06-06

**Why:** Was the stock template ("Main Menu" text + click-anywhere) and was never shown. Built a real title screen.

**Key details:**
- Dark themed background (0x0d0820) + faded `background` image.
- Row of bobbing pill sprites. `pillCount` MUST be 5 — only `pill_0`…`pill_4` textures exist (5 colors); a 6th (`pill_5`) renders Phaser's missing-texture placeholder. This was the "rightmost pill renders wrong" bug.
- ℞ mark, "PILL MATCH" title, italic subtitle.
- "Survive N days" objective headline where N is the imported `DAYS_TO_SURVIVE` (single source of truth, not a literal).
- Objective paragraph; the day count is also interpolated from `DAYS_TO_SURVIVE`.
- START button: rounded rectangle, hover color change, hand cursor, pulse tween → `scene.start('Game')`.

**Dependencies:** imports `DAYS_TO_SURVIVE` from scenes/Game.ts.

**Gotchas / decisions:** Removed the unused `GameObjects` import (was flagged by `tsc --noEmit`).

---

## [MODIFIED] src/game/scenes/Game.ts — 2026-06-06 (several features)

**Why:** Doses-taken breakdown, overdose scoring + danger flash, morning/evening day cycle, more moves, and two new end conditions with win/lose.

**Key details:**
- **Doses display:** replaced single `dosesCount` with `prescribedDoses` + `overDoses`. The DOSES TAKEN readout renders as `9 + 3` — prescribed count in white (`dosesText`), overdoses in red (`overText`, `"+ N"`). `layoutDosesDisplay()` centers the pair as a group (origin 0,0.5 + dynamic X). Cleared cells are classified by `cell.type === currentRequiredColor()`, captured **before** `advancePrescription()` may change it.
- **Overdose scoring:** only prescribed pills score (`prescribedThisPop × 10 × chainMultiplier`); each over pill subtracts `OVERDOSE_PENALTY` (20). Removed the old `Math.max(0, …)` clamp so the score can go negative (required for the loss condition).
- **2 doses/day:** `DOSES_PER_DAY = 2`, `TIMES_OF_DAY = ['Morning','Evening']`. `day = floor(idx / DOSES_PER_DAY) + 1`; top-bar shows `Day N` / time-of-day on two lines; day-advance audio fires every `DOSES_PER_DAY`. Display index clamped to `WEEK_END_INDEX - 1` so it can't flash "Day 8" during the final cascade.
- **Moves:** `INITIAL_MOVES` 30 → 60.
- **End conditions** (in `onFallComplete`, before the existing checks): survived the week (`prescriptionIndex >= WEEK_END_INDEX`, where `WEEK_END_INDEX = DAYS_TO_SURVIVE × DOSES_PER_DAY = 14`) and fatal overdose (`isOverdoseFatal()`: `prescribedDoses > 0 && overDoses >= prescribedDoses × 2`). `triggerGameOver(reason)` sets `won = score > 0` and passes `{won, reason}` to GameOver.
- **Overdose danger flash:** `overFlashTween` pulses `overText` alpha (1 → 0.15, yoyo, loop) when `overDoses > prescribedDoses`; stops + restores alpha otherwise. Driven by `updateOverDangerFlash()` from `layoutDosesDisplay()`.
- Exported `DAYS_TO_SURVIVE` so MainMenu can stay in sync.

**Dependencies:** imports `GameOverReason` (added to types.ts).

**Gotchas / decisions:**
- Capture the required color **before** `advancePrescription()` when counting doses.
- Reset all new fields (`prescribedDoses`, `overDoses`, `overFlashTween`) in `create()` — Phaser reuses the Scene instance across restarts, so stale state/tween refs would otherwise carry over.
- The overdose guard `prescribedDoses > 0` prevents an instant loss on the very first wrong move (before any prescribed pill is taken).

---

## [MODIFIED] src/game/config/prescriptions.ts — 2026-06-06

**Why:** With 2 doses/day (morning/evening), the old "midday/afternoon" entry no longer fit.

**Key details:** Messages rewritten so EVEN indices are morning doses and ODD indices are evening doses. Pills unchanged. Added a comment documenting the convention: keep an even number of entries so the morning/evening parity stays aligned as the list loops.

---

## [MODIFIED] src/game/types.ts — 2026-06-06

**Why:** Carry the win/lose outcome and end reason from Game → GameOver.

**Key details:** Added `GameOverReason = 'survived' | 'overdose' | 'outOfMoves'`. `GameOverData` gains `won: boolean` (true if final score is positive) and `reason: GameOverReason`.

---

## [REWRITTEN] src/game/scenes/GameOver.ts — 2026-06-06

**Why:** Declare WIN or LOSE based on score, explain how the game ended, and add Main Menu navigation.

**Key details:**
- Headline "YOU WIN" (green) when `won`, else "YOU LOSE" (red); `won` falls back to `score > 0` for direct navigation.
- `reasonText()` returns a flavor line per `GameOverReason` (surviving the week with a negative score still reads as a loss).
- Score tinted red when negative.
- PLAY AGAIN → `scene.start('Game')`; added MAIN MENU → `scene.start('MainMenu')`.

**Dependencies:** imports `GameOverData`, `GameOverReason` from types.ts.

---

## [RELEASE] README, LICENSE, package.json, screenshot, git — 2026-06-06

**Why:** Prepare the project for public release under the PlayableStories GitHub org.

**Key details:**
- **README.md:** full rewrite (was the stock Phaser template) — concept, how to play, scoring, win/lose, features, tech stack, getting started (⚠️ Node 18+), configuration/tuning (prescriptions + balance constants), project structure, credits, MIT.
- **screenshot.png:** replaced the template image with a real in-game capture.
- **LICENSE:** copyright changed to "2026 William Wong" (was Phaser Studio Inc).
- **package.json:** `name` → `pill-match`, `version` → 1.0.0, real description, `author` William Wong, repository/bugs/homepage → `github.com/PlayableStories/pill-match`.
- **Git:** `git init` on `main`; published to https://github.com/PlayableStories/pill-match (public) via `gh`, with description and topics (game, puzzle-game, match-3, phaser, phaser4, typescript, vite, html5-game, browser-game, webgl).

**Gotchas / decisions:** Node 14 is the system default but too old for Vite 6 (`||=` syntax error); dev/build require Node 18+ (use nvm `nvm use 24`).

---

# ═══════════════════════════════════════════════════════════════════════════
# Session 3 — 2026-06-06 (Level 1 forking: central config / reskin)
# ═══════════════════════════════════════════════════════════════════════════

## [CREATED] src/game/config/gameConfig.ts — 2026-06-06

**Why:** Centralize everything a re-theme / re-skin needs into one file so forkers don't hunt through scene code. Backs "Level 1" forking in the README.

**Key details:**
- Exports a single `CONFIG: GameConfig` object grouped into: `rules` (movesPerGame, dosesPerDay, daysToSurvive, scorePerDose, overdosePenalty, fatalOverdoseMultiplier, winScoreThreshold, minMatchLength, shuffleAfterWrongMoves), `board` (rows, cols, cellSize, originX/Y, tokenScale), `tokens` (5 × {name, fill, highlight, labelColor}), `tokenShape`, `theme` (background/accent/subtle/over colors), `display` (showDoses/showOverdose/showTarget/showMoves), `timesOfDay`, and `text` (title, hud labels, shuffleMessage, menu copy, gameOver headlines/reasons/buttons).
- Derived exports: `COLOR_COUNT = tokens.length`, `WEEK_END_INDEX = daysToSurvive × dosesPerDay`.
- `objectiveHeadline` / `objectiveBody` support a `{days}` placeholder.

**Gotchas / decisions:** Token count stays 5 — `PillType` remains the literal union `0|1|2|3|4`; the tokens list MUST keep length 5. `timesOfDay` length should equal `dosesPerDay`. No `as const`, so forkers can edit values freely.

---

## [MODIFIED] PillGrid.ts, PillTextures.ts, Game.ts, MainMenu.ts, GameOver.ts, prescriptions.ts — 2026-06-06

**Why:** Point all the previously-hardcoded magic numbers and string literals at `CONFIG`, with behavior unchanged by default.

**Key details:**
- **PillGrid.ts:** the exported `GRID_*`/`CELL_SIZE` constants now derive from `CONFIG.board`; random spawn uses `COLOR_COUNT`; token scale from `CONFIG.board.tokenScale`; match runs use `CONFIG.rules.minMatchLength`.
- **PillTextures.ts:** colors/count from `CONFIG.tokens`; new `traceTokenPath()` switch on `CONFIG.tokenShape` (`capsule` | `circle` | `roundedSquare`).
- **Game.ts:** all former module consts (INITIAL_MOVES, OVERDOSE_PENALTY, DOSES_PER_DAY, TIMES_OF_DAY, DAYS_TO_SURVIVE, WEEK_END_INDEX, PILL_NAMES, PILL_LABEL_COLORS) replaced with `CONFIG`/derived references; scoring, fatal-overdose, win threshold, shuffle threshold, day labels, background, and all HUD text from `CONFIG`. **Display toggles**: `dosesText`/`overText`/`requiredPillIcon`/`movesText` are now optional and guarded behind `CONFIG.display.*`; `layoutDosesDisplay`/`updateOverDangerFlash`/`updateUI` null-guard them. New **MOVES** HUD (far right, directly under the doses counter at x=864, y≈140/172), updated in `updateUI`.
- **MainMenu.ts / GameOver.ts:** text + theme from `CONFIG` (`{days}` interpolated). MainMenu now imports `CONFIG` instead of `DAYS_TO_SURVIVE` from Game (that export was removed).
- **prescriptions.ts:** comment pointing to `gameConfig.ts`.

**Gotchas / decisions:** Optional HUD fields are reset to `undefined` in `create()` (Scene instance persists across restarts → stale destroyed refs otherwise). `showMoves` defaults to **true** (the reviewed/approved placement).

---

## [MODIFIED] README.md — 2026-06-06

**Why:** Document the new two-level forking model.

**Key details:** Reworked "Fork It & Tell Your Own Story" into **Level 1 — Re-theme / Re-skin** (edit `gameConfig.ts` + `prescriptions.ts`, with a section table) and **Level 2 — Re-mechanic** (engine code, with a where-to-edit table). Updated the guidance to lead with the central config file.

---
