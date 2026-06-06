# 🍴 Forking Pill Match — Tell Your Own Story

The engine is intentionally decoupled from the story it tells, so Pill Match is a good starting point for telling a **different** story with the same mechanics — a different health message, a routine, a habit, anything that maps onto "do the right thing in the right order, and don't overdo it."

## Fork & run

```bash
# Fork on GitHub (the "Fork" button), or with the GitHub CLI:
gh repo fork PlayableStories/pill-match --clone

cd pill-match
npm install      # Node 18+
npm run dev      # http://localhost:8080
```

---

## Level 1 — Forking

Level 1 keeps the Match-3 base and reuses this project as your foundation. It comes in two flavours: a pure **re-skin** (config only) and a deeper **re-mechanic** (engine code). Most forks start with the first and reach for the second only when they want to change how the game *plays and argues*.

### A. Re-theme / Re-skin *(no engine code)*

Almost everything you need to reskin or re-balance the game lives in **two config files** — change them and the whole game follows, no scene logic required.

**`src/game/config/gameConfig.ts`** — a single `CONFIG` object grouped into sections:

| Section | Controls |
|---|---|
| `rules` | Days to survive, doses per day, moves per game, score per dose, overdose penalty, fatal-overdose multiplier, win-score threshold, match length, shuffle threshold |
| `board` | Grid rows/cols, cell size, origin, token scale |
| `tokens` | The five tokens — `name`, `fill`, `highlight`, `labelColor` (rename / recolor the "pills") |
| `tokenShape` | `'capsule'`, `'circle'`, or `'roundedSquare'` |
| `theme` | Background colors and accent / subtle / danger colors |
| `display` | Toggle each HUD element — doses, overdose, target, moves |
| `text` | **Every on-screen string** — title, HUD labels, menu copy, game-over headlines & reasons, button labels |

**`src/game/config/prescriptions.ts`** — the dialog messages and the dose orders (which token, in which order, each day).

> Keep the `tokens` list at **5 entries** — token indices are typed (`PillType = 0|1|2|3|4`). You can restyle them freely; changing how *many* there are is a re-mechanic change (see Part B).

A good first exercise: open `gameConfig.ts`, change `daysToSurvive`, recolor and rename a couple of `tokens`, rewrite the `text`, and reorder a few `prescriptions` — and watch the same mechanics carry a completely different meaning, all without touching engine code.

### B. Re-mechanic *(engine code)*

Change how the game *plays and argues* — this is where you reshape the procedural message itself:

| To change… | Edit… |
|---|---|
| **Number of token types**, new match rules, board behavior | `src/game/PillGrid.ts`, `src/game/types.ts` (`PillType`) |
| **Scoring model & win/lose conditions** | `src/game/scenes/Game.ts` (`processMatches`, `onFallComplete`, `triggerGameOver`, `isOverdoseFatal`) |
| **New end states / reasons** | `src/game/types.ts` (`GameOverReason`) + `Game.ts` + `GameOver.ts` |
| **Token rendering / shapes / image assets** | `src/game/PillTextures.ts` |
| **Sound** | `src/game/PillAudio.ts` |
| **New scenes or flow** | `src/game/main.ts` (scene list) + `src/game/scenes/` |

> 📓 `DEVLOG.md` documents every file and the reasoning behind each decision — read it before making re-mechanic changes. Pull requests and forks are welcome.

---

## Level 2 — Rebuild from a Prompt (AI Builder)

Level 1 edits *this* codebase. Level 2 treats the **game itself as a prompt**: instead of cloning the repo, you describe the game to an **AI builder** and have it generate the whole thing for you — then refine it in conversation. This is, in fact, how Pill Match was built (iteratively, with an AI coding agent), and it's the fastest way to spin up your *own* mechanics-as-message game.

### Where to do it

- **AI coding agents** — e.g. [Claude Code](https://claude.com/claude-code), Cursor. Best when you want a real project (Vite + TypeScript + Phaser), a git repo, and full control. Pair with a capable model such as Claude Opus or Sonnet.
- **AI app builders** — e.g. Bolt, v0, Lovable, Replit Agent. Best for a quick playable prototype in the browser with little setup. Capabilities and the resulting stack vary by platform.

Either way the move is the same: give it a clear spec, then iterate one feature at a time.

### Starter prompt

Paste this into your AI builder as the opening brief, then refine from there:

```text
Build a browser-based Match-3 puzzle game called "Pill Match" using Phaser 4,
Vite, and TypeScript. Draw all tokens programmatically with the Canvas API —
no image assets.

Concept (mechanics tell the story): the game is about taking medicine safely.
The player follows a doctor's PRESCRIPTION instead of just chasing a high score.

Core rules:
- An 8x8 board of 5 colored pill tokens. Click a token, then an adjacent one,
  to swap; a swap only counts if it makes a line of 3+.
- Each day has two doses: MORNING then EVENING. A prescription dialog shows
  1–3 required pill colors in a specific order.
- Only the CURRENTLY REQUIRED color clears and advances the prescription.
  Clearing any other color is an "overdose."
- Survive 7 days (through day 7 evening). 60 moves total; a move is only spent
  on a swap that makes a match. If no valid move for the required color exists,
  reshuffle the board.

Scoring & win/lose (the inversion of a normal Match-3):
- Prescribed pills score +10 × cascade multiplier. Overdoses subtract 20 each.
  Score CAN go negative.
- WIN: survive the week with a positive score. LOSE: negative score, OR a fatal
  overdose (overdoses reach 2× the prescribed pills taken), OR running out of moves.

UI:
- Top bar HUD: day & time of day, the current target pill, and a "doses taken"
  readout shown as "9 + 3" (prescribed in white, overdoses in red that flashes
  when overdoses exceed prescribed).
- A main menu (title, objective, Start) and a win/lose game-over screen.
- Canvas scales to fit the window.

Architecture: put all tunable values (rules, board, token colors/names, theme
colors, every on-screen string, display toggles) in ONE central config file so
the game can be reskinned without touching engine code. Keep prescriptions
(messages + dose orders) in their own config file.

Build it incrementally and let me play-test after each step.
```

### How to drive the build

1. **Scaffold first** — project setup + an empty Phaser scene that runs.
2. **Core Match-3** — board, swapping, match detection, gravity, refill.
3. **Story layer** — prescriptions, required-color gating, the day/dose cycle.
4. **Scoring & end states** — overdose penalty, win/lose, game-over screen.
5. **Menu & polish** — title screen, HUD, sound, danger flash, fit-to-window.

Ask for **one step at a time**, play-test, and correct course in plain language ("the overdose counter should flash," "make each day two doses"). Keep a running design log (like this repo's `DEVLOG.md`) so the agent — and the next person — can reconstruct intent.

### Tell a different story

The prompt is the easiest thing to fork. Swap the **theme and message** ("prescriptions / overdose" → your own routine, habit, or safety message), restate the **win/lose rules** so they argue *your* point, and keep the rest. The same Match-3 skeleton will carry a completely different meaning — which is the whole idea.
