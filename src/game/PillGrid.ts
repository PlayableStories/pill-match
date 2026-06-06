import { Scene } from 'phaser';
import { PillType, PillCell, Grid } from './types';
import { CONFIG, COLOR_COUNT } from './config/gameConfig';

export const GRID_ROWS = CONFIG.board.rows;
export const GRID_COLS = CONFIG.board.cols;
export const CELL_SIZE = CONFIG.board.cellSize;
export const GRID_ORIGIN_X = CONFIG.board.originX;   // pixel x of left edge of col 0
export const GRID_ORIGIN_Y = CONFIG.board.originY;   // pixel y of top edge of row 0

export interface FallItem {
    sprite: Phaser.GameObjects.Sprite;
    toY: number;
    delay: number;
}

export function cellToWorld(row: number, col: number): { x: number; y: number } {
    return {
        x: GRID_ORIGIN_X + col * CELL_SIZE + CELL_SIZE / 2,
        y: GRID_ORIGIN_Y + row * CELL_SIZE + CELL_SIZE / 2,
    };
}

export class PillGrid {
    grid: Grid;

    private scene: Scene;
    private onCellClick: (row: number, col: number) => void;

    constructor(scene: Scene, onCellClick: (row: number, col: number) => void) {
        this.scene = scene;
        this.onCellClick = onCellClick;
        this.grid = Array.from({ length: GRID_ROWS }, () =>
            new Array<PillCell | null>(GRID_COLS).fill(null)
        );
    }

    // ── Populate ──────────────────────────────────────────────────────────────

    populate(): void {
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                let type: PillType;
                do {
                    type = (Math.floor(Math.random() * COLOR_COUNT)) as PillType;
                } while (
                    (col >= 2 &&
                        this.grid[row][col - 1]?.type === type &&
                        this.grid[row][col - 2]?.type === type) ||
                    (row >= 2 &&
                        this.grid[row - 1][col]?.type === type &&
                        this.grid[row - 2][col]?.type === type)
                );
                this.grid[row][col] = this.spawnCell(row, col, type);
            }
        }
    }

    private spawnCell(row: number, col: number, type: PillType): PillCell {
        const { x, y } = cellToWorld(row, col);
        const sprite = this.scene.add.sprite(x, y, `pill_${type}`);
        sprite.setScale(CONFIG.board.tokenScale);
        sprite.setInteractive();

        const cell: PillCell = { type, sprite, row, col, matched: false };

        sprite.on('pointerdown', () => {
            this.onCellClick(cell.row, cell.col);
        });

        return cell;
    }

    // Spawn above the grid at a given pixel y, used during refill
    private spawnCellAt(col: number, pixelY: number, type: PillType): PillCell {
        const { x } = cellToWorld(0, col);
        const sprite = this.scene.add.sprite(x, pixelY, `pill_${type}`);
        sprite.setScale(CONFIG.board.tokenScale);
        sprite.setInteractive();

        // row/col will be set by the caller before returning
        const cell: PillCell = { type, sprite, row: 0, col, matched: false };

        sprite.on('pointerdown', () => {
            this.onCellClick(cell.row, cell.col);
        });

        return cell;
    }

    // ── Match detection ───────────────────────────────────────────────────────

    // Returns ALL matching cell positions (all colors). Required-color filtering
    // is the Game scene's responsibility.
    findMatches(): Array<{ row: number; col: number }> {
        const matched = new Set<string>();

        const mark = (r: number, c: number) => matched.add(`${r},${c}`);

        // Horizontal runs
        for (let r = 0; r < GRID_ROWS; r++) {
            let runStart = 0;
            for (let c = 1; c <= GRID_COLS; c++) {
                const cur = c < GRID_COLS ? this.grid[r][c]?.type : -1;
                const start = this.grid[r][runStart]?.type;
                if (cur !== start) {
                    if (c - runStart >= CONFIG.rules.minMatchLength) {
                        for (let k = runStart; k < c; k++) mark(r, k);
                    }
                    runStart = c;
                }
            }
        }

        // Vertical runs
        for (let c = 0; c < GRID_COLS; c++) {
            let runStart = 0;
            for (let r = 1; r <= GRID_ROWS; r++) {
                const cur = r < GRID_ROWS ? this.grid[r][c]?.type : -1;
                const start = this.grid[runStart][c]?.type;
                if (cur !== start) {
                    if (r - runStart >= CONFIG.rules.minMatchLength) {
                        for (let k = runStart; k < r; k++) mark(k, c);
                    }
                    runStart = r;
                }
            }
        }

        return Array.from(matched).map(key => {
            const [r, c] = key.split(',').map(Number);
            return { row: r, col: c };
        });
    }

    // ── Gravity ───────────────────────────────────────────────────────────────

    // Slide non-null cells down within each column. Returns tween data.
    applyGravity(): FallItem[] {
        const items: FallItem[] = [];

        for (let col = 0; col < GRID_COLS; col++) {
            let writeRow = GRID_ROWS - 1;
            for (let row = GRID_ROWS - 1; row >= 0; row--) {
                const cell = this.grid[row][col];
                if (cell !== null) {
                    if (row !== writeRow) {
                        this.grid[writeRow][col] = cell;
                        this.grid[row][col] = null;
                        cell.row = writeRow;
                        items.push({
                            sprite: cell.sprite,
                            toY: cellToWorld(writeRow, col).y,
                            delay: (writeRow - row) * 20,
                        });
                    }
                    writeRow--;
                }
            }
        }

        return items;
    }

    // ── Refill ────────────────────────────────────────────────────────────────

    // Fill any null slots from the top with new pills spawned above the grid.
    refill(): FallItem[] {
        const items: FallItem[] = [];

        for (let col = 0; col < GRID_COLS; col++) {
            let spawnCount = 0;
            for (let row = 0; row < GRID_ROWS; row++) {
                if (this.grid[row][col] === null) {
                    const type = (Math.floor(Math.random() * COLOR_COUNT)) as PillType;
                    const spawnY = GRID_ORIGIN_Y - (spawnCount + 1) * CELL_SIZE;
                    const cell = this.spawnCellAt(col, spawnY, type);
                    cell.row = row;
                    cell.col = col;
                    this.grid[row][col] = cell;
                    items.push({
                        sprite: cell.sprite,
                        toY: cellToWorld(row, col).y,
                        delay: spawnCount * 40,
                    });
                    spawnCount++;
                }
            }
        }

        return items;
    }

    // ── Valid-move detection ──────────────────────────────────────────────────

    // Returns true if at least one swap exists that would produce a match
    // of the given required color. Checks all adjacent pairs via virtual swap.
    hasValidMoveForColor(requiredType: PillType): boolean {
        const directions: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                for (const [dr, dc] of directions) {
                    const r2 = r + dr;
                    const c2 = c + dc;
                    if (r2 < 0 || r2 >= GRID_ROWS || c2 < 0 || c2 >= GRID_COLS) continue;

                    // Virtual swap (grid slot references only — no sprite moves)
                    const tmp = this.grid[r][c];
                    this.grid[r][c] = this.grid[r2][c2];
                    this.grid[r2][c2] = tmp;

                    const matches = this.findMatches();
                    const found = matches.some(({ row, col }) =>
                        this.grid[row][col]?.type === requiredType
                    );

                    // Undo virtual swap
                    this.grid[r2][c2] = this.grid[r][c];
                    this.grid[r][c] = tmp;

                    if (found) return true;
                }
            }
        }
        return false;
    }

    // Destroy all sprites and repopulate with a fresh random grid.
    reset(): void {
        this.destroy();
        this.grid = Array.from({ length: GRID_ROWS }, () =>
            new Array<PillCell | null>(GRID_COLS).fill(null)
        );
        this.populate();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    cellAt(row: number, col: number): PillCell | null {
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
        return this.grid[row][col];
    }

    adjacentTo(r1: number, c1: number, r2: number, c2: number): boolean {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    destroy(): void {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                this.grid[r][c]?.sprite.destroy();
                this.grid[r][c] = null;
            }
        }
    }
}
