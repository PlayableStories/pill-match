# Reference Prompt — Build Pill Match with AI

This is the **Level 2** path for forkers. Use it two ways:

- **Faithful rebuild** — recreate Pill Match on a different platform / stack.
- **Creative fork** — use the prompt as a template and change the title, theme, tokens, rules, and prescription content during generation. Same mechanics, your message.

If you only want to swap text, colors, and balance on an existing copy of this repo, [FORKING.md](./FORKING.md) (Level 1) is faster.

## When to use Level 2

Choose Level 2 if you want any of:

- A different stack (a non-Phaser engine, a different framework, native mobile — whatever's current when you read this)
- Substantially different mechanics (different board size, token count, scoring model, or end conditions)
- To re-theme the game during generation (creative fork) rather than after
- A clean codebase without inheriting our git history

Otherwise, Level 1 is the cheaper path.

## How to use this document

Paste the prompt below into your AI builder of choice. It's self-contained — the builder doesn't need to crawl this repo, though it can if it supports URL references (the link is at the bottom of the prompt).

The prompt's last section asks the AI to **present a checklist back to you and wait for your confirmation before writing code** — covering the theme, tokens, rules, the full mechanics list, *and* the Level 1 forking/config options. Use that moment to adjust anything (especially for a creative fork) and to confirm the easy-to-miss requirements (smooth animations) are on its list.

---

## The prompt

````markdown
You will build a Match-3 puzzle game as a single-page web app. The reference
theme is "Pill Match" — a game about taking medicine safely — but the human
pasting this prompt may want a different theme. Confirm the theme and every
item in the checklist with them before you start (see "Confirmation before you
build" at the end). Do NOT write code until they confirm.

## Concept (the mechanics tell the story)

This is a Match-3 whose *rules are inverted* to make a point. In a normal
Match-3, more clearing is always better. Here the player follows a doctor's
PRESCRIPTION: take the right pills, in the right order, and don't overdose.
Clearing the wrong thing hurts you. The reference message is medication safety;
a creative fork can map the same structure onto any "do the right thing in the
right order, and don't overdo it" message.

## Reference stack (what we tested with — substitute freely)

- Phaser 4 (game engine, WebGL/Canvas)
- Vite (dev server + bundler)
- TypeScript
- All token art drawn programmatically with the Canvas API — NO image assets

> If you are an AI reading this and the listed stack is no longer the current
> standard at the time of reading, substitute the current standard. Preserve
> only the required mechanics and the central-config architecture, not the
> specific framework versions.

## Required mechanics (must ALL be present and working)

The game is NOT done until every one of these is implemented and observable in
a single playthrough. Pay special attention to the ANIMATION items (4–8) —
these are the most commonly skipped.

1. **Board** — an 8×8 grid of 5 token types, drawn programmatically. The
   initial fill must contain no pre-existing 3-in-a-rows.
2. **Selection & swap** — click a token to select it (show a pulsing highlight),
   then click an orthogonally adjacent token to swap. Swapping two tokens that
   form no match must **animate back** (reverse) and NOT cost a move.
3. **Match detection** — 3+ identical tokens in a row or column, scanned
   horizontally and vertically, with overlaps de-duplicated.
4. **Smooth swap animation** — both tokens tween to each other's cell
   simultaneously (ease in-out), and the reverse animates too.
5. **Pop animation** — matched tokens scale down to zero and fade out (do not
   just disappear).
6. **Smooth gravity** — after pops, every surviving token in a column SLIDES
   down into the empty space below it with an eased/bounce tween; the fall delay
   is proportional to how far it travels. This must be a visible animation, not
   an instant snap. (Builders often skip this — make sure it's smooth.)
7. **Animated refill** — new tokens spawn ABOVE the board and fall into the
   empty top cells with the same easing, staggered per column.
8. **Cascades** — after a fall settles, re-check for new matches and resolve
   them; a chain multiplier increases with each cascade in a single turn.
9. **Prescription system** — a dialog (semi-transparent, fades in/out) shows the
   required 1–3 token colors IN ORDER (with arrows between them) and an OK
   button. Only the CURRENTLY REQUIRED color clears-and-advances the
   prescription. Matching other colors still clears them, but they count as
   OVERDOSES and do not advance the prescription.
10. **Required-color highlight** — tokens of the currently required color are at
    full opacity; all others are dimmed.
11. **Day cycle** — two doses per day, MORNING then EVENING. Survive 7 days
    (through day 7 evening) to win.
12. **Moves** — 60 per game; a move is spent ONLY on a swap that makes a match.
13. **Stuck handling** — if no valid move exists for the required color (after a
    few wrong-color moves), reshuffle the board and show a brief message.
14. **Scoring** — prescribed pills score +10 × cascade multiplier; each overdose
    pill subtracts 20. Score CAN go negative.
15. **Doses-taken HUD** — show "prescribed + over" as e.g. "9 + 3": the
    prescribed count in white and the overdose count in red. The red figure
    FLASHES once overdoses exceed the prescribed count.
16. **Win / lose** — WIN: survive the week with a positive score. LOSE: a
    negative score, OR a fatal overdose (overdoses reach 2× the prescribed pills
    taken), OR running out of moves. The game-over screen shows WIN or LOSE, a
    one-line reason, the score, moves used, and Play Again + Main Menu buttons.
17. **Scenes / flow** — Boot → Preloader (generate token textures) → Main Menu
    (title, objective, Start) → Game → Game Over.
18. **Fit-to-window** — the canvas scales proportionally to fit any window size
    without clipping (letterbox as needed); the game's fixed design coordinates
    stay valid.
19. **Audio (nice to have)** — simple procedurally-generated sound effects for
    pop / invalid swap / dialog / day advance / game over, plus optional looping
    background music. No audio asset files.

## Central-config architecture (this is the key design)

Put EVERYTHING a re-skin needs in ONE config file, and the prescription content
in a second. A non-programmer should be able to retheme the game by editing
only these, with no engine code:

- `src/game/config/gameConfig.ts` — a single `CONFIG` object grouped into:
  - `rules` — daysToSurvive (7), dosesPerDay (2), movesPerGame (60),
    scorePerDose (10), overdosePenalty (20), fatalOverdoseMultiplier (2),
    winScoreThreshold (0), minMatchLength (3), shuffleAfterWrongMoves (3)
  - `board` — rows (8), cols (8), cellSize, origin, token scale
  - `tokens` — the 5 tokens: name, fill color, highlight color, label color
  - `tokenShape` — 'capsule' | 'circle' | 'roundedSquare'
  - `theme` — background colors + accent / subtle / danger colors
  - `display` — toggles for each HUD element (doses, overdose, target, moves)
  - `timesOfDay` — ['Morning', 'Evening']
  - `text` — EVERY on-screen string: title, HUD labels, menu copy, game-over
    headlines + reasons, button labels
- `src/game/config/prescriptions.ts` — the per-dose dialog messages and the
  ordered list of required token colors. Even-indexed entries are morning doses,
  odd-indexed are evening; keep an even number.

Keep token indices typed (e.g. a `0|1|2|3|4` union) so the token list stays at 5
unless the user explicitly asks for a different count.

## Aesthetic (default theme)

Dark, calm, slightly clinical. Dark purple/navy background, capsule-shaped pill
tokens with a soft highlight and a center seam line, bold sans-serif HUD with
black strokes, a gold accent for the title and buttons, red for overdose/danger.
For a creative fork, swap the palette and token shape to match the chosen theme;
the structural rules (single config file, themed colors, themed text) stay.

## Done definition

- The dev server opens a playable game in the browser.
- A single playthrough visibly exercises EVERY required mechanic — including
  smooth gravity, animated refill, and cascades (not instant snaps).
- Both a WIN and a LOSS are reachable, each showing the correct game-over screen;
  Play Again and Main Menu both work.
- Editing a value in `gameConfig.ts` or a message in `prescriptions.ts` and
  saving hot-reloads the running game.

## Confirmation before you build

Before writing any code, present this checklist to the user as your reply and
**wait for confirmation or changes**:

```
Here's the game I'll build. Tell me what to change before I start.

THEME & CONTENT (Level 1 forking options — change these for a creative fork)
- Title: <Pill Match, or the user's theme title>
- Message / setting: <medication safety — change for a creative fork>
- 5 tokens (name + color): <red, blue, yellow, green, white — rename/recolor>
- Token shape: <capsule | circle | roundedSquare>
- Prescriptions: morning/evening dose orders + dialog messages
- All on-screen text: title, HUD labels, menu copy, game-over text, buttons

RULES (Level 1 config — confirm or adjust the numbers)
- Days to survive: 7        - Doses per day: 2 (Morning, Evening)
- Moves per game: 60        - Score per prescribed pill: 10 (× cascade)
- Overdose penalty: 20      - Fatal overdose at: 2× prescribed
- Win when score > 0        - Match length: 3   - Board: 8×8, 5 colors

MECHANICS I WILL IMPLEMENT (the game isn't done until all work)
- Click-select + adjacent swap; invalid swap animates back, costs no move
- Match-3 detection (rows + columns)
- SMOOTH animations: swap, pop, gravity slide, animated refill, cascades
- Prescription gating (only required color advances; others = overdose)
- Required-color highlight; morning/evening day cycle; stuck-board reshuffle
- Scoring with overdose penalty (score can go negative)
- Doses-taken "9 + 3" HUD with flashing red overdose count
- Win / lose (survive week + positive score / negative / fatal overdose / no moves)
- Menu + game-over screens; fit-to-window scaling; (optional) procedural audio

ARCHITECTURE
- Central config: gameConfig.ts (rules/board/tokens/theme/text/display) +
  prescriptions.ts (messages + dose orders) — confirm

STACK
- <state your stack — Phaser 4 + Vite + TypeScript, or your platform's default>

Confirm or tell me what to change before I start.
```

Only proceed once the user confirms. Then build incrementally and let the user
play-test after each step: scaffold → core Match-3 (with smooth animations) →
prescription/day layer → scoring + win/lose → menu + game-over → polish.

---

Structural reference (if your builder can browse repos): https://github.com/PlayableStories/pill-match
````

---

## Platform notes

**These observations are a snapshot from when we tested. Builder defaults shift fast — if your builder behaves differently from this table, trust the builder, not the table.**

| Builder | First tested | What we observed | Suggested approach |
|---|---|---|---|
| Replit Agent | 2026-06 | ~80% on first generation. Core Match-3, prescriptions, scoring, and win/lose came through, but it did **not** implement smooth gravity / cascade animation automatically (tokens snapped into place). | Paste the prompt verbatim, then in the confirmation step explicitly confirm the SMOOTH-animation items (swap, pop, gravity, refill, cascade). If they're missing after generation, ask for them in a follow-up turn. |
| Bolt.new | — | Likely similar (same web ecosystem). | Paste verbatim; call out the animation requirements. |
| v0.app | — | Expected to default to its own stack (Next.js + Tailwind) and may reinvent the config schema. | Use the confirmation step to push back on stack and on the single-config-file architecture. |
| Lovable.dev | — | Expected similar to v0. | As with v0. |
| Cursor / Claude Code | — | The structural-reference URL at the bottom of the prompt is most useful here — they can browse this repo as well as read the prompt. Pair with a capable model such as Claude Opus or Sonnet. | Paste prompt + let them clone the reference. |

If you're using a builder we haven't tested, **add what you observed** via PR.

## After generation

Once your builder produces a playable game, sanity-check it:

1. Walk through the AI's pre-build confirmation reply and make sure every
   required mechanic — **especially smooth gravity, refill, and cascades** — is
   on its list. If something's missing, say so before it starts.
2. Play a full run; confirm pops, gravity, refill, and cascades are smoothly
   animated (not instant snaps).
3. Reach both a WIN and a LOSS; click Play Again and Main Menu.
4. Edit a color in `gameConfig.ts` and a message in `prescriptions.ts`; confirm
   both hot-reload.
5. Customize the content, tokens, and theme to your story.

If any of these fail, paste the failure back into the same chat with your
builder — they usually fix it in a follow-up turn.

---

## Improvements welcome

The prompt evolves as we learn what builders do well and where they stumble. If
you tested it on a builder not in the table, or found a refinement that landed
reliably, open a PR at <https://github.com/PlayableStories/pill-match>.
