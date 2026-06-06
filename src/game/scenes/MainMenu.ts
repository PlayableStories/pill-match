import { Scene } from 'phaser';
import { DAYS_TO_SURVIVE } from './Game';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        //  Themed dark background, consistent with the GameOver scene
        this.cameras.main.setBackgroundColor(0x0d0820);
        this.add.image(512, 384, 'background').setAlpha(0.12);

        //  Decorative row of pills along the top, gently bobbing.
        //  There are 5 pill colors (textures pill_0 … pill_4).
        const pillCount = 5;
        const spacing = 96;
        const startX = 512 - ((pillCount - 1) * spacing) / 2;

        for (let i = 0; i < pillCount; i++)
        {
            const pill = this.add.image(startX + i * spacing, 150, `pill_${i}`)
                .setScale(1.1);

            this.tweens.add({
                targets: pill,
                y: pill.y - 14,
                duration: 1200,
                ease: 'Sine.inOut',
                yoyo: true,
                repeat: -1,
                delay: i * 120,
            });
        }

        //  Rx pharmacy mark above the title
        this.add.text(512, 250, '℞', {
            fontFamily: 'Georgia, serif', fontSize: '64px', color: '#7fd1ff',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        //  Game title
        this.add.text(512, 332, 'PILL MATCH', {
            fontFamily: 'Arial Black', fontSize: '84px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 10,
        }).setOrigin(0.5);

        this.add.text(512, 392, 'A Prescription Match-3', {
            fontFamily: 'Arial', fontSize: '24px', color: '#9aa0d4',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        //  Objective headline
        this.add.text(512, 452, `Survive ${DAYS_TO_SURVIVE} days`, {
            fontFamily: 'Arial Black', fontSize: '34px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        //  Brief objective
        this.add.text(
            512, 512,
            'Take your medicine exactly as prescribed — match only the pill\n' +
            'the doctor ordered, in the right order. Make it through all\n' +
            `${DAYS_TO_SURVIVE} days without overdosing on the wrong pills.`,
            {
                fontFamily: 'Arial', fontSize: '22px', color: '#d7dbff',
                align: 'center', lineSpacing: 8,
                wordWrap: { width: 760 },
            }
        ).setOrigin(0.5);

        //  Start button
        this.createStartButton(512, 600);
    }

    private createStartButton (x: number, y: number)
    {
        const width = 260;
        const height = 70;
        const idle = 0x2e7d32;
        const hover = 0x43a047;

        const bg = this.add.rectangle(x, y, width, height, idle)
            .setStrokeStyle(4, 0x000000)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(x, y, 'START', {
            fontFamily: 'Arial Black', fontSize: '36px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5);

        bg.on('pointerover', () => bg.setFillStyle(hover));
        bg.on('pointerout', () => bg.setFillStyle(idle));
        bg.on('pointerdown', () => this.scene.start('Game'));

        //  Gentle pulse to draw the eye
        this.tweens.add({
            targets: [bg, label],
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 900,
            ease: 'Sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    }
}
