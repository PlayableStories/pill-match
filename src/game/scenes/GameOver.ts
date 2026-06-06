import { Scene } from 'phaser';
import { GameOverData, GameOverReason } from '../types';

export class GameOver extends Scene
{
    private finalScore = 0;
    private movesUsed = 0;
    private won = false;
    private reason: GameOverReason = 'outOfMoves';

    constructor ()
    {
        super('GameOver');
    }

    init (data: Partial<GameOverData>)
    {
        this.finalScore = data.score ?? 0;
        this.movesUsed = data.movesUsed ?? 0;
        this.won = data.won ?? (this.finalScore > 0);
        this.reason = data.reason ?? 'outOfMoves';
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x0d0820);

        this.add.image(512, 384, 'background').setAlpha(0.15);

        //  Headline: win or loss, decided by score sign
        this.add.text(512, 190, this.won ? 'YOU WIN' : 'YOU LOSE', {
            fontFamily: 'Arial Black', fontSize: '72px',
            color: this.won ? '#44dd66' : '#ff4444',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5);

        //  Flavor line describing how the game ended
        this.add.text(512, 258, this.reasonText(), {
            fontFamily: 'Arial', fontSize: '24px', color: '#cfcfe8',
            align: 'center', wordWrap: { width: 760 },
        }).setOrigin(0.5);

        this.add.text(512, 340, `Score: ${this.finalScore}`, {
            fontFamily: 'Arial Black', fontSize: '42px',
            color: this.finalScore >= 0 ? '#ffffff' : '#ff7777',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(512, 400, `Moves used: ${this.movesUsed}`, {
            fontFamily: 'Arial', fontSize: '26px', color: '#aaaacc',
        }).setOrigin(0.5);

        // Play Again button
        const playBtn = this.add.text(512, 490, '[ PLAY AGAIN ]', {
            fontFamily: 'Arial Black', fontSize: '32px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => playBtn.setColor('#ffffff'));
        playBtn.on('pointerout', () => playBtn.setColor('#ffdd00'));
        playBtn.on('pointerdown', () => this.scene.start('Game'));

        // Main Menu button
        const menuBtn = this.add.text(512, 558, '[ MAIN MENU ]', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#aaaaff',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
        menuBtn.on('pointerout', () => menuBtn.setColor('#aaaaff'));
        menuBtn.on('pointerdown', () => this.scene.start('MainMenu'));
    }

    private reasonText (): string
    {
        switch (this.reason) {
            case 'survived':
                return this.won
                    ? 'You made it through the whole week, taken care of.'
                    : 'You lasted the week, but the overdoses took their toll.';
            case 'overdose':
                return 'Overdose — you took far too many of the wrong pills.';
            case 'outOfMoves':
            default:
                return 'You ran out of moves.';
        }
    }
}
