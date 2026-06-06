import { Scene } from 'phaser';

export const PILL_TEXTURE_SIZE = 64;

const PILL_COLORS = [
    { fill: '#e87878', highlight: '#ffc0c0' }, // 0 red   (softened with white)
    { fill: '#6688e8', highlight: '#aabbff' }, // 1 blue  (softened with white)
    { fill: '#d8cc60', highlight: '#fff0a0' }, // 2 yellow (softened with white)
    { fill: '#58c060', highlight: '#9ee0a0' }, // 3 green  (softened with white)
    { fill: '#e8e8e8', highlight: '#ffffff' }, // 4 white
];

// Called once from Preloader.create() — produces textures 'pill_0' through 'pill_4'.
// Textures are global (TextureManager) so they persist across scene restarts.
export function generatePillTextures(scene: Scene): void {
    const s = PILL_TEXTURE_SIZE;
    const rx = s / 2;       // horizontal radius of the capsule
    const ry = s * 0.42;    // vertical radius (rounder pill shape)
    const cx = s / 2;
    const cy = s / 2;

    for (let i = 0; i < 5; i++) {
        const key = `pill_${i}`;
        if (scene.textures.exists(key)) continue;

        const tex = scene.textures.createCanvas(key, s, s);
        if (!tex) continue;

        const ctx = tex.context;
        const { fill, highlight } = PILL_COLORS[i];

        // Capsule body
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        // Dark border
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight stripe across upper third
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
        ctx.clip();
        const grad = ctx.createLinearGradient(0, cy - ry, 0, cy);
        grad.addColorStop(0, highlight + 'cc');
        grad.addColorStop(1, highlight + '00');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);
        ctx.restore();

        // Dividing line across the middle (pill seam)
        ctx.beginPath();
        ctx.moveTo(cx - (rx - 4), cy);
        ctx.lineTo(cx + (rx - 4), cy);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Upload canvas pixels to the WebGL texture
        tex.refresh();
    }
}
