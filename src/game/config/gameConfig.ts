// ═════════════════════════════════════════════════════════════════════════════
//  CENTRAL GAME CONFIG  —  Level 1 forking (re-theme / re-skin)
// ─────────────────────────────────────────────────────────────────────────────
//  Almost everything you need to reskin or re-theme the game lives here:
//  rules & balance, board geometry, the tokens (pills), theme colors, every
//  on-screen string, and toggles for which HUD elements show.
//
//  Editing this file requires NO engine/scene code changes. For the dialog
//  messages and dose orders, see ./prescriptions.ts.
//
//  Note: the token list MUST stay length 5 — pill color indices are typed as
//  PillType (0|1|2|3|4) elsewhere. You can rename/recolor/reshape them freely.
// ═════════════════════════════════════════════════════════════════════════════

export type TokenShape = 'capsule' | 'circle' | 'roundedSquare';

export interface TokenStyle {
    name: string;        // shown in the prescription dialog
    fill: string;        // body color (hex)
    highlight: string;   // highlight/sheen color (hex)
    labelColor: string;  // color of the name label under the dialog icon
}

export interface GameConfig {
    rules: {
        movesPerGame: number;
        dosesPerDay: number;
        daysToSurvive: number;
        scorePerDose: number;          // points per prescribed pill (× chain multiplier)
        overdosePenalty: number;       // points lost per overdose (wrong-color) pill
        fatalOverdoseMultiplier: number; // game over when overdoses ≥ prescribed × this
        winScoreThreshold: number;     // win if final score is strictly greater than this
        minMatchLength: number;        // tokens in a row/col needed to match
        shuffleAfterWrongMoves: number; // wrong-color moves before a stuck board reshuffles
    };
    board: {
        rows: number;
        cols: number;
        cellSize: number;   // pixels
        originX: number;    // pixel x of the left edge of column 0
        originY: number;    // pixel y of the top edge of row 0
        tokenScale: number; // sprite scale for tokens on the board
    };
    tokens: TokenStyle[];
    tokenShape: TokenShape;
    theme: {
        gameBackground: number;  // 0xRRGGBB
        menuBackground: number;
        topBarColor: number;
        accent: string;          // hex — primary highlight (title, buttons)
        subtle: string;          // hex — secondary labels
        overColor: string;       // hex — overdose / danger
    };
    display: {
        showDoses: boolean;
        showOverdose: boolean;
        showTarget: boolean;
        showMoves: boolean;
    };
    timesOfDay: string[];        // length should equal rules.dosesPerDay
    text: {
        title: string;
        hud: {
            targetLabel: string;
            dosesLabel: string;
            movesLabel: string;
            dayWord: string;
        };
        shuffleMessage: string;
        menu: {
            subtitle: string;
            objectiveHeadline: string; // supports the {days} placeholder
            objectiveBody: string;     // supports the {days} placeholder
            startButton: string;
        };
        gameOver: {
            win: string;
            lose: string;
            playAgain: string;
            mainMenu: string;
            reasons: {
                survivedWin: string;
                survivedLose: string;
                overdose: string;
                outOfMoves: string;
            };
        };
    };
}

export const CONFIG: GameConfig = {
    rules: {
        movesPerGame: 60,
        dosesPerDay: 2,
        daysToSurvive: 7,
        scorePerDose: 10,
        overdosePenalty: 20,
        fatalOverdoseMultiplier: 2,
        winScoreThreshold: 0,
        minMatchLength: 3,
        shuffleAfterWrongMoves: 3,
    },
    board: {
        rows: 8,
        cols: 8,
        cellSize: 70,
        originX: 232,
        originY: 130,
        tokenScale: 0.85,
    },
    tokens: [
        { name: 'red',    fill: '#e87878', highlight: '#ffc0c0', labelColor: '#ff6666' },
        { name: 'blue',   fill: '#6688e8', highlight: '#aabbff', labelColor: '#6688ff' },
        { name: 'yellow', fill: '#d8cc60', highlight: '#fff0a0', labelColor: '#ffee44' },
        { name: 'green',  fill: '#58c060', highlight: '#9ee0a0', labelColor: '#66dd66' },
        { name: 'white',  fill: '#e8e8e8', highlight: '#ffffff', labelColor: '#e8e8e8' },
    ],
    tokenShape: 'capsule',
    theme: {
        gameBackground: 0x1a0a2e,
        menuBackground: 0x0d0820,
        topBarColor: 0x0d0820,
        accent: '#ffdd00',
        subtle: '#aaaaff',
        overColor: '#ff5555',
    },
    display: {
        showDoses: true,
        showOverdose: true,
        showTarget: true,
        showMoves: true,
    },
    timesOfDay: ['Morning', 'Evening'],
    text: {
        title: 'PILL MATCH',
        hud: {
            targetLabel: 'TARGET',
            dosesLabel: 'DOSES TAKEN',
            movesLabel: 'MOVES',
            dayWord: 'Day',
        },
        shuffleMessage: 'I am confused,\nthey are probably in another drawer.',
        menu: {
            subtitle: 'A Prescription Match-3',
            objectiveHeadline: 'Survive {days} days',
            objectiveBody:
                'Take your medicine exactly as prescribed — match only the pill\n' +
                'the doctor ordered, in the right order. Make it through all\n' +
                '{days} days without overdosing on the wrong pills.',
            startButton: 'START',
        },
        gameOver: {
            win: 'YOU WIN',
            lose: 'YOU LOSE',
            playAgain: '[ PLAY AGAIN ]',
            mainMenu: '[ MAIN MENU ]',
            reasons: {
                survivedWin: 'You made it through the whole week, taken care of.',
                survivedLose: 'You lasted the week, but the overdoses took their toll.',
                overdose: 'Overdose — you took far too many of the wrong pills.',
                outOfMoves: 'You ran out of moves.',
            },
        },
    },
};

// ── Derived constants (do not edit — computed from CONFIG) ────────────────────
export const COLOR_COUNT = CONFIG.tokens.length;
export const WEEK_END_INDEX = CONFIG.rules.daysToSurvive * CONFIG.rules.dosesPerDay;
