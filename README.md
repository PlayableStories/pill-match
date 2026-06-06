# 💊 Pill Match

A prescription-themed **Match-3** puzzle game. Follow the doctor's orders, take your medicine in the right order — morning and evening — and survive a full week without overdosing.

Built with [Phaser 4](https://phaser.io), [Vite](https://vitejs.dev) and [TypeScript](https://www.typescriptlang.org). All pill art is drawn in code, so the game ships with **zero image assets**.

![Pill Match screenshot](screenshot.png)

---

## 🎯 The Goal

Each day you receive a **prescription**: one to three pill colors you must take **in a specific order**. There are two doses a day — **morning** and **evening**.

**Survive 7 days with a positive score to win.**

You lose if you:
- finish the week with a **negative score**,
- **overdose** — let the wrong-color pills you take reach **double** the prescribed pills, or
- run out of **moves**.

---

## 🕹️ How to Play

1. A prescription dialog shows the pills you need and their order. Press **OK**.
2. **Click a pill**, then **click an adjacent pill** to swap them.
3. A swap only counts if it forms a match of **3+ in a row or column**.
4. **Only the currently required color clears** and advances your prescription. Clearing other colors still happens, but those are *overdoses* — they cost you.
5. Work through the prescription, then the next dose, then the next day.

You have **60 moves**. A move is only spent on a swap that produces a match. If you get stuck with no valid move for the required color, the board reshuffles.

### Scoring

| Action | Effect |
|---|---|
| Clear a **prescribed** (required-color) pill | **+10** × cascade multiplier |
| Clear a **wrong-color** pill (overdose) | **−20** each |
| Cascades (chain reactions) | Increase the score multiplier within a turn |

The "Doses Taken" counter reads as `9 + 3` — **9** taken as prescribed (white) and **+3** overdoses (red). The red figure **flashes** as a danger warning once your overdoses exceed your prescribed count, and a fatal overdose (2× prescribed) ends the game.

---

## ✨ Features

- **No art assets** — all five pill sprites are generated at runtime with the Canvas API.
- **Prescription system** — configurable dialogs with ordered, multi-pill doses.
- **Day cycle** — two doses per day (morning / evening) across a 7-day run.
- **Overdose penalty** with an escalating, flashing danger indicator.
- **Win / lose** outcome screen driven by your final score.
- **Fit-to-window scaling** — the canvas scales to any window size without clipping.

---

## 🛠️ Tech Stack

- **[Phaser 4](https://github.com/phaserjs/phaser)** — game engine (WebGL/Canvas)
- **[Vite 6](https://vitejs.dev)** — dev server & bundler
- **[TypeScript 5.7](https://www.typescriptlang.org)** — type-checked source

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18 or newer** (Vite 6 requires it; Node 20+ LTS recommended).

### Install & run

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:8080
```

Then open **http://localhost:8080** in your browser. Vite hot-reloads on save.

### Build for production

```bash
npm run build    # output to dist/
```

Upload the contents of `dist/` to any static web host to deploy.

> The `dev` / `build` scripts send a single anonymous ping (template name, dev/prod, Phaser version) via `log.js`. Use `npm run dev-nolog` / `npm run build-nolog` to skip it, or delete `log.js` and remove it from `package.json` scripts.

---

## ⚙️ Configuration & Tuning

Game balance lives in a few easy-to-edit places:

**Prescriptions** — `src/game/config/prescriptions.ts`
Add, edit, or reorder the doses. Even-indexed entries are morning doses, odd-indexed are evening; keep an even number of entries so the pattern stays aligned. Each entry is a message and an ordered list of 1–3 pill colors (`0=red 1=blue 2=yellow 3=green 4=white`).

**Balance constants** — top of `src/game/scenes/Game.ts`

| Constant | Default | Meaning |
|---|---|---|
| `INITIAL_MOVES` | `60` | Moves allowed before game over |
| `DOSES_PER_DAY` | `2` | Doses per day (morning / evening) |
| `DAYS_TO_SURVIVE` | `7` | Days to survive to win |
| `OVERDOSE_PENALTY` | `20` | Points lost per overdose pill |

---

## 📁 Project Structure

| Path | Description |
|---|---|
| `index.html` | Page hosting the game canvas |
| `src/main.ts` | App bootstrap |
| `src/game/main.ts` | Phaser config — scaling and the scene list |
| `src/game/scenes/` | Boot, Preloader, MainMenu, Game, GameOver scenes |
| `src/game/PillGrid.ts` | Grid data + sprite management (match/gravity/refill) |
| `src/game/PillTextures.ts` | Programmatic pill texture generation |
| `src/game/PillAudio.ts` | Sound effects |
| `src/game/config/prescriptions.ts` | Prescription definitions |
| `src/game/types.ts` | Shared TypeScript types |
| `public/` | Static assets served as-is |
| `DEVLOG.md` | Detailed development log of each file and decision |

---

## 🙏 Credits

- Created by **William Wong**.
- Bootstrapped from the [Phaser Vite + TypeScript template](https://github.com/phaserjs/template-vite-ts) by Phaser Studio.

## 📄 License

Released under the [MIT License](LICENSE).
