import { Scene } from 'phaser';
import { PillGrid, GRID_ROWS, GRID_COLS, cellToWorld, FallItem } from '../PillGrid';
import { GameState, GameOverData, GameOverReason, PillType } from '../types';
import { PRESCRIPTIONS } from '../config/prescriptions';
import { PillAudio } from '../PillAudio';

const INITIAL_MOVES = 60;
const OVERDOSE_PENALTY = 20;
const DOSES_PER_DAY = 2;
const TIMES_OF_DAY = ['Morning', 'Evening'];
export const DAYS_TO_SURVIVE = 7;
//  Doses completed once the player survives the full week (day 7 evening).
const WEEK_END_INDEX = DAYS_TO_SURVIVE * DOSES_PER_DAY;
const PILL_NAMES = ['red', 'blue', 'yellow', 'green', 'white'];
const PILL_LABEL_COLORS = ['#ff6666', '#6688ff', '#ffee44', '#66dd66', '#e8e8e8'];

export class Game extends Scene
{
    private grid!: PillGrid;
    private state!: GameState;
    private pendingDialog = false;
    private otherColorMoves = 0;
    private prescribedDoses = 0;
    private overDoses = 0;

    private daysText!: Phaser.GameObjects.Text;
    private dosesText!: Phaser.GameObjects.Text;
    private overText!: Phaser.GameObjects.Text;
    private overFlashTween?: Phaser.Tweens.Tween;
    private requiredPillIcon!: Phaser.GameObjects.Sprite;
    private selectionIndicator!: Phaser.GameObjects.Graphics;
    private dialogContainer!: Phaser.GameObjects.Container;
    private shuffleText!: Phaser.GameObjects.Text;
    private audio!: PillAudio;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x1a0a2e);

        this.state = {
            phase: 'dialog',
            score: 0,
            moves: INITIAL_MOVES,
            chainMultiplier: 1,
            selected: null,
            prescription: { prescriptionIndex: 0, stepIndex: 0 },
        };

        this.otherColorMoves = 0;
        this.prescribedDoses = 0;
        this.overDoses = 0;
        this.overFlashTween = undefined;

        this.buildUI();
        this.buildSelectionIndicator();
        this.buildShuffleText();

        this.grid = new PillGrid(this, (row, col) => this.handleCellClick(row, col));
        this.grid.populate();

        this.events.on('shutdown', () => this.grid.destroy(), this);

        this.audio = new PillAudio(this);
        this.events.on('shutdown', () => this.audio.destroy(), this);

        this.showPrescriptionDialog();
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    private buildUI(): void {
        this.add.rectangle(512, 59, 1024, 118, 0x0d0820, 0.92);

        this.daysText = this.add.text(160, 80, 'Day 1\nMorning', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5);

        this.add.text(512, 30, 'PILL MATCH', {
            fontFamily: 'Arial Black', fontSize: '26px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5);

        this.add.text(512, 72, 'TARGET', {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#aaaaff',
        }).setOrigin(0.5);
        this.requiredPillIcon = this.add.sprite(512, 95, 'pill_0');
        this.requiredPillIcon.setScale(0.45);

        this.add.text(864, 30, 'DOSES TAKEN', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#aaaaff',
        }).setOrigin(0.5);
        //  Prescribed doses (white) and over/extra doses (red), e.g. "9 + 3"
        this.dosesText = this.add.text(864, 80, '0', {
            fontFamily: 'Arial Black', fontSize: '34px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0, 0.5);
        this.overText = this.add.text(864, 80, '+ 0', {
            fontFamily: 'Arial Black', fontSize: '34px', color: '#ff5555',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0, 0.5);
        this.layoutDosesDisplay();
    }

    /** Renders "prescribed + over" centered under the DOSES TAKEN header. */
    private layoutDosesDisplay(): void {
        this.dosesText.setText(String(this.prescribedDoses));
        this.overText.setText(`+ ${this.overDoses}`);

        const gap = 8;
        const totalW = this.dosesText.width + gap + this.overText.width;
        const left = 864 - totalW / 2;
        this.dosesText.setX(left);
        this.overText.setX(left + this.dosesText.width + gap);

        this.updateOverDangerFlash();
    }

    /** Flashes the "+ N" overdose readout once overdoses exceed prescribed pills,
     *  warning that a fatal overdose (double prescribed) is approaching. */
    private updateOverDangerFlash(): void {
        const danger = this.overDoses > this.prescribedDoses;

        if (danger && !this.overFlashTween) {
            this.overFlashTween = this.tweens.add({
                targets: this.overText,
                alpha: { from: 1, to: 0.15 },
                duration: 300,
                yoyo: true,
                repeat: -1,
            });
        } else if (!danger && this.overFlashTween) {
            this.overFlashTween.stop();
            this.overFlashTween = undefined;
            this.overText.setAlpha(1);
        }
    }

    private buildSelectionIndicator(): void {
        this.selectionIndicator = this.add.graphics();
        this.selectionIndicator.lineStyle(3, 0xffffff, 1);
        this.selectionIndicator.strokeRoundedRect(-32, -32, 64, 64, 8);
        this.selectionIndicator.setVisible(false);

        this.tweens.add({
            targets: this.selectionIndicator,
            alpha: { from: 1, to: 0.25 },
            duration: 500,
            yoyo: true,
            loop: -1,
        });
    }

    private buildShuffleText(): void {
        this.shuffleText = this.add.text(512, 384, 'I am confused,\nthey are probably in another drawer.', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 5,
            align: 'center',
        }).setOrigin(0.5).setAlpha(0).setDepth(50);
    }

    private updateUI(): void {
        //  Clamp to the last dose of the week so the header never shows a day
        //  beyond the survival goal during the final cascade.
        const idx = Math.min(this.state.prescription.prescriptionIndex, WEEK_END_INDEX - 1);
        const day = Math.floor(idx / DOSES_PER_DAY) + 1;
        const timeOfDay = TIMES_OF_DAY[idx % DOSES_PER_DAY];
        this.daysText.setText(`Day ${day}\n${timeOfDay}`);
        this.layoutDosesDisplay();

        const required = this.currentRequiredColor();
        this.requiredPillIcon.setTexture(`pill_${required}`);
    }

    // ── Prescription dialog ───────────────────────────────────────────────────

    private showPrescriptionDialog(): void {
        this.state.phase = 'dialog';
        this.pendingDialog = false;
        this.audio.playDialogOpen();

        const idx = this.state.prescription.prescriptionIndex % PRESCRIPTIONS.length;
        const prescription = PRESCRIPTIONS[idx];

        if (this.dialogContainer) this.dialogContainer.destroy();

        const W = 620, H = 300;
        const items: Phaser.GameObjects.GameObject[] = [];

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.82);
        bg.fillRoundedRect(-W / 2, -H / 2, W, H, 18);
        bg.lineStyle(2, 0x444466, 1);
        bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 18);
        items.push(bg);

        const msgText = this.add.text(0, -H / 2 + 52, prescription.message, {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff',
            align: 'center', wordWrap: { width: W - 60 },
        }).setOrigin(0.5);
        items.push(msgText);

        const pills = prescription.pills;
        const iconSpacing = 90;
        const totalWidth = (pills.length - 1) * iconSpacing;
        const startX = -totalWidth / 2;

        for (let i = 0; i < pills.length; i++) {
            const px = startX + i * iconSpacing;

            const icon = this.add.sprite(px, 10, `pill_${pills[i]}`);
            icon.setScale(0.75);
            items.push(icon);

            const label = this.add.text(px, 54, PILL_NAMES[pills[i]], {
                fontFamily: 'Arial', fontSize: '18px', color: PILL_LABEL_COLORS[pills[i]],
            }).setOrigin(0.5);
            items.push(label);

            if (i < pills.length - 1) {
                const arrow = this.add.text(px + iconSpacing / 2, 10, '→', {
                    fontFamily: 'Arial Black', fontSize: '28px', color: '#888888',
                }).setOrigin(0.5);
                items.push(arrow);
            }
        }

        const btnBg = this.add.rectangle(0, H / 2 - 41, 120, 42, 0x334488)
            .setInteractive({ useHandCursor: true });
        btnBg.on('pointerover', () => { btnBg.setFillStyle(0x5566cc); btnText.setColor('#ffdd00'); });
        btnBg.on('pointerout',  () => { btnBg.setFillStyle(0x334488); btnText.setColor('#ffffff'); });
        btnBg.on('pointerdown', () => { this.audio.playOkClick(); this.hidePrescriptionDialog(); });
        items.push(btnBg);

        const btnText = this.add.text(0, H / 2 - 41, 'OK', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff',
        }).setOrigin(0.5);
        items.push(btnText);

        this.dialogContainer = this.add.container(512, 384, items);
        this.dialogContainer.setDepth(100);
        this.dialogContainer.setAlpha(0);

        this.tweens.add({
            targets: this.dialogContainer,
            alpha: 1,
            duration: 200,
            ease: 'Quad.easeOut',
        });
    }

    private hidePrescriptionDialog(): void {
        this.tweens.add({
            targets: this.dialogContainer,
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.dialogContainer.setVisible(false);
                this.updatePillHighlights();
                this.updateUI();
                this.state.phase = 'idle';
            },
        });
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    handleCellClick(row: number, col: number): void {
        if (this.state.phase !== 'idle' && this.state.phase !== 'selected') return;

        if (this.state.phase === 'idle') {
            this.state.selected = { row, col };
            this.state.phase = 'selected';
            this.showSelectionIndicator(row, col);
            return;
        }

        const sel = this.state.selected!;

        if (sel.row === row && sel.col === col) {
            this.state.selected = null;
            this.state.phase = 'idle';
            this.hideSelectionIndicator();
            return;
        }

        if (!this.grid.adjacentTo(sel.row, sel.col, row, col)) {
            this.state.selected = { row, col };
            this.showSelectionIndicator(row, col);
            return;
        }

        this.state.phase = 'swapping';
        this.hideSelectionIndicator();
        this.executeSwap(sel.row, sel.col, row, col);
    }

    private showSelectionIndicator(row: number, col: number): void {
        const { x, y } = cellToWorld(row, col);
        this.selectionIndicator.setPosition(x, y).setVisible(true);
    }

    private hideSelectionIndicator(): void {
        this.selectionIndicator.setVisible(false);
    }

    // ── Swap ──────────────────────────────────────────────────────────────────

    private executeSwap(r1: number, c1: number, r2: number, c2: number): void {
        const cell1 = this.grid.cellAt(r1, c1)!;
        const cell2 = this.grid.cellAt(r2, c2)!;
        const pos1 = cellToWorld(r1, c1);
        const pos2 = cellToWorld(r2, c2);

        let tweensDone = 0;

        const onBothDone = () => {
            tweensDone++;
            if (tweensDone < 2) return;

            this.grid.grid[r1][c1] = cell2;
            this.grid.grid[r2][c2] = cell1;
            cell1.row = r2; cell1.col = c2;
            cell2.row = r1; cell2.col = c1;

            const allMatches = this.grid.findMatches();

            if (allMatches.length === 0) {
                // No match at all — reverse the swap
                this.audio.playInvalidSwap();
                this.tweens.add({
                    targets: cell1.sprite, x: pos1.x, y: pos1.y,
                    duration: 180, ease: 'Quad.easeInOut',
                });
                this.tweens.add({
                    targets: cell2.sprite, x: pos2.x, y: pos2.y,
                    duration: 180, ease: 'Quad.easeInOut',
                    onComplete: () => {
                        this.grid.grid[r1][c1] = cell1;
                        this.grid.grid[r2][c2] = cell2;
                        cell1.row = r1; cell1.col = c1;
                        cell2.row = r2; cell2.col = c2;
                        this.state.phase = 'idle';
                    },
                });
            } else {
                // Any match clears pills; only required-color match advances prescription
                const required = this.currentRequiredColor();
                const hasRequiredMatch = allMatches.some(({ row, col }) =>
                    this.grid.cellAt(row, col)?.type === required
                );
                if (hasRequiredMatch) {
                    this.otherColorMoves = 0;
                } else {
                    this.otherColorMoves++;
                }
                this.state.moves--;
                this.state.chainMultiplier = 1;
                this.state.phase = 'checking';
                this.processMatches(allMatches, hasRequiredMatch);
            }
        };

        this.tweens.add({
            targets: cell1.sprite, x: pos2.x, y: pos2.y,
            duration: 200, ease: 'Quad.easeInOut', onComplete: onBothDone,
        });
        this.tweens.add({
            targets: cell2.sprite, x: pos1.x, y: pos1.y,
            duration: 200, ease: 'Quad.easeInOut', onComplete: onBothDone,
        });
    }

    // ── Match resolution ──────────────────────────────────────────────────────

    private processMatches(validMatches: Array<{ row: number; col: number }>, isPlayerMove = false, playSound = true): void {
        this.state.phase = 'popping';

        if (playSound) {
            isPlayerMove ? this.audio.playPopRequired() : this.audio.playPopOther();
        }

        //  Count cleared pills by color: the required color is a prescribed dose,
        //  anything else cleared in this pop is an extra/overdose. Capture the
        //  required color now, before advancePrescription() may change it.
        const required = this.currentRequiredColor();
        let prescribedThisPop = 0;
        let overThisPop = 0;
        for (const { row, col } of validMatches) {
            const cell = this.grid.cellAt(row, col);
            if (!cell) continue;
            if (cell.type === required) prescribedThisPop++;
            else overThisPop++;
            cell.matched = true;
        }
        this.prescribedDoses += prescribedThisPop;
        this.overDoses += overThisPop;

        //  Only prescribed pills score; each overdose subtracts a penalty.
        //  Score may go negative — a negative final score is a loss.
        const gained = prescribedThisPop * 10 * this.state.chainMultiplier;
        const penalty = overThisPop * OVERDOSE_PENALTY;
        this.state.score += gained - penalty;

        if (isPlayerMove) this.advancePrescription();
        this.updateUI();

        this.animatePop(validMatches, () => {
            for (const { row, col } of validMatches) {
                const cell = this.grid.grid[row][col];
                if (cell?.matched) {
                    cell.sprite.destroy();
                    this.grid.grid[row][col] = null;
                }
            }

            this.state.phase = 'falling';
            const fallItems = this.grid.applyGravity();
            const refillItems = this.grid.refill();
            const allFall = [...fallItems, ...refillItems];

            this.updatePillHighlights();

            if (allFall.length === 0) {
                this.onFallComplete();
            } else {
                this.animateFall(allFall, () => this.onFallComplete());
            }
        });
    }

    private onFallComplete(): void {
        this.state.phase = 'cascading';

        const cascadeMatches = this.grid.findMatches();

        if (cascadeMatches.length > 0) {
            this.state.chainMultiplier++;
            this.processMatches(cascadeMatches, false, false);
        } else {
            this.state.chainMultiplier = 1;
            if (this.state.prescription.prescriptionIndex >= WEEK_END_INDEX) {
                //  Completed day 7 evening — survived the full week.
                this.triggerGameOver('survived');
            } else if (this.isOverdoseFatal()) {
                //  Overdoses reached double the prescribed pills taken.
                this.triggerGameOver('overdose');
            } else if (this.state.moves <= 0) {
                this.triggerGameOver('outOfMoves');
            } else if (this.pendingDialog) {
                this.showPrescriptionDialog();
            } else if (
                this.otherColorMoves >= 3 &&
                !this.grid.hasValidMoveForColor(this.currentRequiredColor())
            ) {
                this.triggerShuffle();
            } else {
                this.state.phase = 'idle';
            }
        }
    }

    /** True once overdoses reach double the prescribed pills (needs at least one
     *  prescribed dose taken, so a single early misstep can't end the game). */
    private isOverdoseFatal(): boolean {
        return this.prescribedDoses > 0 && this.overDoses >= this.prescribedDoses * 2;
    }

    private triggerShuffle(): void {
        this.audio.playShuffle();
        this.otherColorMoves = 0;
        let attempts = 0;
        do {
            this.grid.reset();
            attempts++;
        } while (!this.grid.hasValidMoveForColor(this.currentRequiredColor()) && attempts < 5);
        this.updatePillHighlights();
        this.shuffleText.setAlpha(1);
        this.tweens.add({
            targets: this.shuffleText,
            alpha: 0,
            duration: 600,
            delay: 1400,
            ease: 'Quad.easeIn',
            onComplete: () => { this.state.phase = 'idle'; },
        });
    }

    // ── Prescription helpers ──────────────────────────────────────────────────

    private currentRequiredColor(): PillType {
        const idx = this.state.prescription.prescriptionIndex % PRESCRIPTIONS.length;
        return PRESCRIPTIONS[idx].pills[this.state.prescription.stepIndex];
    }

    private advancePrescription(): void {
        const idx = this.state.prescription.prescriptionIndex % PRESCRIPTIONS.length;
        const prescription = PRESCRIPTIONS[idx];
        this.state.prescription.stepIndex++;
        this.otherColorMoves = 0;

        if (this.state.prescription.stepIndex >= prescription.pills.length) {
            this.state.prescription.prescriptionIndex++;
            this.state.prescription.stepIndex = 0;
            this.pendingDialog = true;
            if (this.state.prescription.prescriptionIndex % DOSES_PER_DAY === 0) {
                this.audio.playDayAdvance();
            }
        }
    }

    private updatePillHighlights(): void {
        const required = this.currentRequiredColor();
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const cell = this.grid.cellAt(r, c);
                if (!cell) continue;
                cell.sprite.setAlpha(cell.type === required ? 1.0 : 0.35);
            }
        }
    }

    // ── Tweens ────────────────────────────────────────────────────────────────

    private animatePop(
        cells: Array<{ row: number; col: number }>,
        onDone: () => void
    ): void {
        let remaining = cells.length;
        const done = () => { if (--remaining === 0) onDone(); };

        for (const { row, col } of cells) {
            const sprite = this.grid.cellAt(row, col)?.sprite;
            if (!sprite) { done(); continue; }
            this.tweens.add({
                targets: sprite,
                scaleX: 0, scaleY: 0, alpha: 0,
                duration: 220, ease: 'Back.easeIn',
                onComplete: done,
            });
        }
    }

    private animateFall(items: FallItem[], onDone: () => void): void {
        let remaining = items.length;
        const done = () => { if (--remaining === 0) onDone(); };

        for (const { sprite, toY, delay } of items) {
            this.tweens.add({
                targets: sprite, y: toY,
                duration: 280, delay,
                ease: 'Bounce.easeOut',
                onComplete: done,
            });
        }
    }

    // ── Game over ─────────────────────────────────────────────────────────────

    private triggerGameOver(reason: GameOverReason): void {
        this.state.phase = 'gameover';
        this.audio.playGameOver();
        const data: GameOverData = {
            score: this.state.score,
            movesUsed: INITIAL_MOVES - this.state.moves,
            won: this.state.score > 0,
            reason,
        };
        this.time.delayedCall(600, () => {
            this.scene.start('GameOver', data);
        });
    }
}
