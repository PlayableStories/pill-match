// ─── Pill color index ────────────────────────────────────────────────────────
// 0=red  1=blue  2=yellow  3=green  4=white
export type PillType = 0 | 1 | 2 | 3 | 4;

// ─── Grid cell ───────────────────────────────────────────────────────────────
export interface PillCell {
    type: PillType;
    sprite: Phaser.GameObjects.Sprite;
    row: number;        // current logical row (updated during gravity)
    col: number;        // current logical col
    matched: boolean;   // scratch flag used during match detection only
}

export type Grid = (PillCell | null)[][];

// ─── Game phase state machine ─────────────────────────────────────────────────
export type GamePhase =
    | 'dialog'      // prescription dialog showing — all game input locked
    | 'idle'        // waiting for first pill click
    | 'selected'    // one pill chosen, waiting for second
    | 'swapping'    // swap tween in flight
    | 'checking'    // match detection (synchronous, sub-frame)
    | 'popping'     // pop/scale-out tween in flight
    | 'falling'     // gravity + refill tweens in flight
    | 'cascading'   // re-checking after a fall completes
    | 'gameover';   // moves exhausted — input fully locked

// ─── Prescription progress ───────────────────────────────────────────────────
export interface PrescriptionState {
    prescriptionIndex: number;  // index into PRESCRIPTIONS (wraps with %)
    stepIndex: number;          // which pill in current prescription.pills is active
}

// ─── Full game state ──────────────────────────────────────────────────────────
export interface GameState {
    phase: GamePhase;
    score: number;
    moves: number;                              // starts at 30
    chainMultiplier: number;                    // 1 first match, +1 per cascade
    selected: { row: number; col: number } | null;
    prescription: PrescriptionState;
}

// ─── Scene data passed from Game → GameOver ───────────────────────────────────
export type GameOverReason = 'survived' | 'overdose' | 'outOfMoves';

export interface GameOverData {
    score: number;
    movesUsed: number;
    won: boolean;               // true if final score is positive
    reason: GameOverReason;     // which end condition fired
}
