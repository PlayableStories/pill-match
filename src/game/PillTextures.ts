import { Scene } from 'phaser';
import { CONFIG } from './config/gameConfig';

export const PILL_TEXTURE_SIZE = 64;

// Called once from Preloader.create() — produces textures 'pill_0' … 'pill_N'
// (one per entry in CONFIG.tokens). Colors and shape come from the central
// config so the tokens can be reskinned without touching this file.
// Textures are global (TextureManager) so they persist across scene restarts.
export function generatePillTextures(scene: Scene): void {
    const s = PILL_TEXTURE_SIZE;
    const cx = s / 2;
    const cy = s / 2;

    for (let i = 0; i < CONFIG.tokens.length; i++) {
        const key = `pill_${i}`;
        if (scene.textures.exists(key)) continue;

        const tex = scene.textures.createCanvas(key, s, s);
        if (!tex) continue;

        const ctx = tex.context;
        const { fill, highlight } = CONFIG.tokens[i];

        // Body silhouette (shape selected by CONFIG.tokenShape)
        traceTokenPath(ctx, CONFIG.tokenShape, s);
        ctx.fillStyle = fill;
        ctx.fill();

        // Dark border
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight gradient across the upper portion, clipped to the body
        ctx.save();
        traceTokenPath(ctx, CONFIG.tokenShape, s);
        ctx.clip();
        const grad = ctx.createLinearGradient(0, 0, 0, cy);
        grad.addColorStop(0, highlight + 'cc');
        grad.addColorStop(1, highlight + '00');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);
        ctx.restore();

        // Dividing line across the middle (seam detail)
        const seamHalf = s / 2 - 6;
        ctx.beginPath();
        ctx.moveTo(cx - seamHalf, cy);
        ctx.lineTo(cx + seamHalf, cy);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Upload canvas pixels to the WebGL texture
        tex.refresh();
    }
}

// Traces the token outline for the given shape onto the 2D context.
function traceTokenPath(
    ctx: CanvasRenderingContext2D,
    shape: typeof CONFIG.tokenShape,
    s: number,
): void {
    const cx = s / 2;
    const cy = s / 2;
    ctx.beginPath();

    switch (shape) {
        case 'circle': {
            const r = s / 2 - 4;
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            break;
        }
        case 'roundedSquare': {
            const m = 6;            // margin
            const r = 12;           // corner radius
            const x = m, y = m, w = s - m * 2, h = s - m * 2;
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            break;
        }
        case 'capsule':
        default: {
            const rx = s / 2 - 2;       // horizontal radius (capsule)
            const ry = s * 0.42 - 2;    // vertical radius (rounder pill shape)
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            break;
        }
    }
}
