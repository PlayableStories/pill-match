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
