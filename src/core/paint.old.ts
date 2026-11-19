// 画。全部程序化：山、塔、墙、树、水、印。
// 不使用实景照片，也不用位图素材；纸纹与墨晕由 assets/ 里的纹理层提供（可选）。

import { STAGE, ridgeY, type Rect } from "./geo.ts";

export const PAL = {
  paper: "#efe7d6",
  paperDeep: "#e2d6bd",
  ink: "#1d2321",
  inkSoft: "#4a524d",
  inkPale: "#8b9187",
  wash: "#aeb8b0",
  water: "#cdd5cc",
  zhu: "#a4382a",
  gold: "#a3833f",
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// ————————————————————————————— 纸 —————————————————————————————

export function paintPaper(seed = 20261119): HTMLCanvasElement {
  const { w, h } = STAGE;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d")!;
  const rnd = mulberry32(seed);
  g.fillStyle = PAL.paper;
  g.fillRect(0, 0, w, h);

  // 大块不匀
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 120 + rnd() * 360;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    const warm = rnd() > 0.5;
    rg.addColorStop(0, warm ? "rgba(214,196,160,0.10)" : "rgba(255,252,244,0.14)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 纤维
  g.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 6 + rnd() * 40;
    const ang = (rnd() - 0.5) * 0.5 + (rnd() > 0.85 ? 1.2 : 0);
    g.strokeStyle = rnd() > 0.55 ? "rgba(120,104,80,0.045)" : "rgba(255,255,250,0.10)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }

  // 四边压深
  const edge = g.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, "rgba(90,74,50,0.10)");
  edge.addColorStop(0.16, "rgba(90,74,50,0)");
  edge.addColorStop(0.84, "rgba(90,74,50,0)");
  edge.addColorStop(1, "rgba(90,74,50,0.12)");
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);

  return c;
}

// ————————————————————————————— 山 —————————————————————————————

export function paintRidgeLayer(opts: {
  offsetY: number;
  alpha: number;
  color: string;
  seed: number;
  mist: number;
}): HTMLCanvasElement {
  const { w, h } = STAGE;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d")!;
  const rnd = mulberry32(opts.seed);

  g.beginPath();
  g.moveTo(-40, h);
  for (let x = -40; x <= w + 40; x += 8) {
    g.lineTo(x, ridgeY(x) + opts.offsetY + Math.sin(x / 43 + opts.seed) * 3);
  }
  g.lineTo(w + 40, h);
  g.closePath();

  const grad = g.createLinearGradient(0, 240 + opts.offsetY, 0, 700 + opts.offsetY);
  grad.addColorStop(0, opts.color);
  grad.addColorStop(0.55, opts.color);
  grad.addColorStop(1, "rgba(240,235,222,0)");
  g.globalAlpha = opts.alpha;
  g.fillStyle = grad;
  g.fill();

  // 山的皴：顺着山势的短线
  g.globalAlpha = opts.alpha * 0.5;
  g.strokeStyle = "rgba(60,66,62,0.5)";
  g.lineWidth = 1.4;
  for (let i = 0; i < 210; i++) {
    const x = rnd() * w;
    const yTop = ridgeY(x) + opts.offsetY;
    const y = yTop + rnd() * rnd() * 190;
    const len = 10 + rnd() * 46;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + len * 0.5, y + 3, x + len, y + 7 + rnd() * 6);
    g.stroke();
  }

  // 雾：横带留白
  g.globalAlpha = opts.mist;
  for (let i = 0; i < 4; i++) {
    const y = 330 + opts.offsetY + i * 62 + rnd() * 20;
    const band = g.createLinearGradient(0, y - 26, 0, y + 26);
    band.addColorStop(0, "rgba(243,238,226,0)");
    band.addColorStop(0.5, "rgba(243,238,226,1)");
    band.addColorStop(1, "rgba(243,238,226,0)");
    g.fillStyle = band;
    g.fillRect(0, y - 26, w, 52);
  }
  g.globalAlpha = 1;
  return c;
}

export function paintXishan(): HTMLCanvasElement {
  const { w, h } = STAGE;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d")!;
  const pts: Array<[number, number]> = [
    [820, 700],
    [900, 640],
    [980, 578],
    [1040, 520],
    [1081, 466],
    [1130, 500],
    [1190, 556],
    [1270, 600],
    [1370, 628],
    [1500, 648],
    [1640, 664],
  ];
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 10, x1, y1);
  }
  g.lineTo(w + 40, h);
  g.lineTo(820, h);
  g.closePath();
  const grad = g.createLinearGradient(0, 460, 0, 760);
  grad.addColorStop(0, "rgba(122,134,126,0.86)");
  grad.addColorStop(1, "rgba(196,198,180,0.30)");
  g.fillStyle = grad;
  g.fill();
  return c;
}

/**
 * 龙光塔。七级，塔身在 r 内；ghost 时只留轮廓。
 * alpha 用于「记忆里的塔」「倒影」。
 */
export function drawPagoda(
  g: CanvasRenderingContext2D,
  r: Rect,
  opts: { alpha?: number; ghost?: boolean; color?: string } = {},
): void {
  const a = opts.alpha ?? 1;
  const color = opts.color ?? PAL.ink;
  const tiers = 7;
  const bodyW = r.w * 0.46;
  const cx = r.x + r.w / 2;
  const tierH = (r.h * 0.9) / tiers;

  g.save();
  g.globalAlpha = a;
  g.strokeStyle = color;
  g.fillStyle = opts.ghost ? "rgba(0,0,0,0)" : "rgba(243,238,226,0.55)";
  g.lineWidth = 2.1;
  g.lineJoin = "round";

  // 塔刹
  g.beginPath();
  g.moveTo(cx, r.y - 4);
  g.lineTo(cx, r.y + tierH * 0.5);
  g.stroke();
  g.beginPath();
  g.arc(cx, r.y + 2, 3.2, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();

  for (let i = 0; i < tiers; i++) {
    const top = r.y + tierH * i + 4;
    const shrink = 1 - i * 0.085;
    const bw = bodyW * shrink;
    const roofW = bw * 1.72;
    // 塔身
    g.beginPath();
    g.rect(cx - bw / 2, top, bw, tierH * 0.72);
    g.fill();
    g.stroke();
    // 檐
    g.beginPath();
    g.moveTo(cx - roofW / 2, top + tierH * 0.16);
    g.quadraticCurveTo(cx - roofW * 0.36, top - tierH * 0.1, cx, top - tierH * 0.16);
    g.quadraticCurveTo(cx + roofW * 0.36, top - tierH * 0.1, cx + roofW / 2, top + tierH * 0.16);
    g.quadraticCurveTo(cx, top + tierH * 0.06, cx - roofW / 2, top + tierH * 0.16);
    g.closePath();
    g.stroke();
    if (!opts.ghost) {
      g.fillStyle = "rgba(29,35,33,0.12)";
      g.fill();
      g.fillStyle = "rgba(243,238,226,0.55)";
    }
  }
  g.restore();
}

// ————————————————————————————— 墙、柱、树、水 —————————————————————————————

export function drawWall(
  g: CanvasRenderingContext2D,
  l: number,
  r: number,
  top: number,
  opts: { bottom?: number; seed?: number; broken?: boolean } = {},
): void {
  const bottom = opts.bottom ?? STAGE.h + 10;
  const rnd = mulberry32(opts.seed ?? 7);
  g.save();
  const grad = g.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, "#f2ecdd");
  grad.addColorStop(0.7, "#e8e0cd");
  grad.addColorStop(1, "#dcd2bc");
  g.fillStyle = grad;

  g.beginPath();
  if (opts.broken) {
    // 断口
    g.moveTo(l, bottom);
    g.lineTo(l, top + 26);
    for (let x = l; x <= r; x += 18) {
      const t = (x - l) / Math.max(1, r - l);
      const jag = Math.sin(t * 9.1) * 18 + Math.sin(t * 23.7) * 9 + (rnd() - 0.5) * 8;
      g.lineTo(x, top + 24 + jag);
    }
    g.lineTo(r, bottom);
  } else {
    g.rect(l, top, r - l, bottom - top);
  }
  g.closePath();
  g.fill();

  // 墙头瓦
  g.strokeStyle = "rgba(45,50,47,0.86)";
  g.lineWidth = 9;
  g.beginPath();
  for (let x = l; x <= r; x += 12) {
    const t = (x - l) / Math.max(1, r - l);
    const jag = opts.broken ? Math.sin(t * 9.1) * 18 + Math.sin(t * 23.7) * 9 : 0;
    if (x === l) g.moveTo(x, top + 6 + jag);
    else g.lineTo(x, top + 6 + jag);
  }
  g.stroke();

  // 水渍
  g.globalAlpha = 0.12;
  const stain = g.createLinearGradient(0, bottom - 190, 0, bottom);
  stain.addColorStop(0, "rgba(80,74,58,0)");
  stain.addColorStop(1, "rgba(80,74,58,1)");
  g.fillStyle = stain;
  g.fillRect(l, bottom - 190, r - l, 190);
  g.globalAlpha = 1;
  g.restore();
}

export function drawTree(g: CanvasRenderingContext2D, cx: number, groundY: number, seed = 31, scale = 1): void {
  const rnd = mulberry32(seed);
  g.save();
  g.translate(cx, groundY);
  g.scale(scale, scale);
  // 主干
  g.strokeStyle = PAL.ink;
  g.lineCap = "round";
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-9, -110, 4, -210);
  g.stroke();
  // 枝
  const branches: Array<[number, number, number, number, number, number]> = [
    [4, -210, -86, -286, -128, -318],
    [4, -210, 84, -276, 130, -300],
    [-2, -168, -70, -212, -104, -232],
    [3, -252, 52, -330, 66, -368],
  ];
  g.lineWidth = 7;
  for (const b of branches) {
    g.beginPath();
    g.moveTo(b[0], b[1]);
    g.quadraticCurveTo(b[2], b[3], b[4], b[5]);
    g.stroke();
  }
  // 点叶
  for (let i = 0; i < 150; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.pow(rnd(), 0.62) * 196;
    const x = Math.cos(ang) * rad * 1.06;
    const y = -300 + Math.sin(ang) * rad * 0.62 - rnd() * 26;
    const s = 4.2 + rnd() * 9.4;
    g.globalAlpha = 0.18 + rnd() * 0.5;
    g.fillStyle = rnd() > 0.72 ? PAL.inkSoft : PAL.ink;
    g.beginPath();
    g.ellipse(x, y, s, s * 0.72, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export function drawWater(g: CanvasRenderingContext2D, top: number, opts: { reflectX?: number; alpha?: number } = {}): void {
  const a = opts.alpha ?? 1;
  g.save();
  g.globalAlpha = a;
  const grad = g.createLinearGradient(0, top, 0, STAGE.h);
  grad.addColorStop(0, "#dfe3d6");
  grad.addColorStop(0.35, "#cfd7cc");
  grad.addColorStop(1, "#b9c4bb");
  g.fillStyle = grad;
  g.fillRect(0, top, STAGE.w, STAGE.h - top);

  // 塔影：横向切片，带波动
  if (opts.reflectX !== undefined) {
    const tmp = makeCanvas(140, 300);
    const tg = tmp.getContext("2d")!;
    drawPagoda(tg, { x: 30, y: 6, w: 78, h: 262 }, { alpha: 0.5, color: PAL.inkSoft });
    g.globalAlpha = a * 0.5;
    for (let y = 0; y < 300; y += 3) {
      const dx = Math.sin((y + top) / 9) * 5 + Math.sin(y / 3.1) * 1.6;
      g.drawImage(tmp, 0, y, 140, 3, opts.reflectX - 70 + dx, top + y, 140, 3);
    }
    g.globalAlpha = a;
  }

  // 波纹
  g.strokeStyle = "rgba(250,247,238,0.55)";
  g.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    const y = top + 8 + i * 8.2;
    const w = 60 + (i % 5) * 34;
    const x = ((i * 233) % STAGE.w) - 40;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w, y);
    g.stroke();
  }
  g.strokeStyle = "rgba(70,80,72,0.16)";
  for (let i = 0; i < 18; i++) {
    const y = top + 14 + i * 11;
    const x = ((i * 397) % STAGE.w) - 60;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 120 + (i % 4) * 60, y);
    g.stroke();
  }
  g.restore();
}

export function drawEave(g: CanvasRenderingContext2D, eaveY: number): void {
  g.save();
  g.fillStyle = "#3b423d";
  g.beginPath();
  g.moveTo(0, eaveY - 26);
  g.lineTo(STAGE.w, eaveY - 26);
  g.lineTo(STAGE.w, eaveY + 34);
  g.lineTo(0, eaveY + 40);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(243,238,226,0.10)";
  for (let x = 20; x < STAGE.w; x += 46) {
    g.fillRect(x, eaveY + 2, 16, 30);
  }
  g.restore();
}

export function drawPosts(g: CanvasRenderingContext2D, pillarL: number, pillarR: number, fromY: number, railY: number): void {
  const bottom = STAGE.h + 10;
  for (const x of [pillarL, pillarR]) {
    g.save();
    const grad = g.createLinearGradient(x, 0, x + 26, 0);
    grad.addColorStop(0, "#4a3b31");
    grad.addColorStop(0.45, "#6b5547");
    grad.addColorStop(1, "#3a2f27");
    g.fillStyle = grad;
    g.fillRect(x, fromY, 26, bottom - fromY);
    g.fillStyle = "rgba(20,16,14,0.30)";
    g.fillRect(x + 20, fromY, 6, bottom - fromY);
    g.fillStyle = "#6d6f66";
    g.fillRect(x - 9, railY - 6, 44, 24);
    g.restore();
  }
}

export function drawRail(g: CanvasRenderingContext2D, railY: number): void {
  const bottom = STAGE.h + 10;
  g.save();
  g.fillStyle = "#e6ddc9";
  g.fillRect(0, railY, STAGE.w, bottom - railY);
  g.fillStyle = "#cfc6b1";
  g.fillRect(0, railY, STAGE.w, 7);
  g.strokeStyle = "rgba(90,84,68,0.42)";
  g.lineWidth = 2;
  for (let x = 0; x < STAGE.w; x += 86) {
    g.beginPath();
    g.moveTo(x, railY + 7);
    g.lineTo(x, railY + 46);
    g.stroke();
  }
  const shade = g.createLinearGradient(0, railY, 0, railY + 90);
  shade.addColorStop(0, "rgba(70,64,50,0.16)");
  shade.addColorStop(1, "rgba(70,64,50,0.02)");
  g.fillStyle = shade;
  g.fillRect(0, railY, STAGE.w, 90);
  g.restore();
}

export function drawTower(g: CanvasRenderingContext2D, x: number, alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  const w = 340;
  const top = 236;
  const grad = g.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#8d94963f");
  grad.addColorStop(0.5, "#6f777a");
  grad.addColorStop(1, "#5b6366");
  g.fillStyle = grad;
  g.fillRect(x, top, w, STAGE.h - top);
  g.strokeStyle = "rgba(240,236,226,0.30)";
  g.lineWidth = 1.4;
  for (let yy = top + 22; yy < STAGE.h; yy += 30) {
    for (let xx = x + 16; xx < x + w - 10; xx += 30) {
      g.strokeRect(xx, yy, 16, 16);
    }
  }
  g.restore();
}

export function drawSeal(g: CanvasRenderingContext2D, cx: number, cy: number, size: number, chars: string[], alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy);
  g.fillStyle = PAL.zhu;
  const r = size * 0.06;
  g.beginPath();
  g.moveTo(-size / 2 + r, -size / 2);
  g.arcTo(size / 2, -size / 2, size / 2, size / 2, r);
  g.arcTo(size / 2, size / 2, -size / 2, size / 2, r);
  g.arcTo(-size / 2, size / 2, -size / 2, -size / 2, r);
  g.arcTo(-size / 2, -size / 2, size / 2, -size / 2, r);
  g.closePath();
  g.fill();
  g.fillStyle = "#f6f0e2";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${size * 0.4}px "Jieshan Serif", serif`;
  if (chars.length >= 2) {
    g.fillText(chars[0], 0, -size * 0.19);
    g.fillText(chars[1], 0, size * 0.21);
  } else {
    g.fillText(chars[0] ?? "", 0, 0);
  }
  g.restore();
}

/** 画框（第 3 关）：四角留白，框线极细，避免抢画意。 */
export function drawFrame(g: CanvasRenderingContext2D, r: Rect, ok: boolean): void {
  g.save();
  g.strokeStyle = ok ? PAL.gold : "rgba(60,64,58,0.55)";
  g.lineWidth = ok ? 2.4 : 1.6;
  g.setLineDash(ok ? [] : [12, 8]);
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.setLineDash([]);
  const L = 26;
  g.lineWidth = ok ? 3.2 : 2.2;
  const corners: Array<[number, number, number, number]> = [
    [r.x, r.y, 1, 1],
    [r.x + r.w, r.y, -1, 1],
    [r.x, r.y + r.h, 1, -1],
    [r.x + r.w, r.y + r.h, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    g.beginPath();
    g.moveTo(x + sx * L, y);
    g.lineTo(x, y);
    g.lineTo(x, y + sy * L);
    g.stroke();
  }
  g.restore();
}
