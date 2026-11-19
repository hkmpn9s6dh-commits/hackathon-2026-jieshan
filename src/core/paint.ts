// 画。材料：生成的水墨素材（远山、塔、树、粉墙）+ 程序化的几何与光。
// 判据用的山脊线与画面同源：RIDGE_PTS 是照着 public/assets/far-range.webp 的山脊量出来的，
// 页面里可以用 ?ridge=1 把这根线画出来比对。

import { STAGE, ridgeY, type Rect, type Pt } from "./geo.ts";

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

export interface Assets {
  far: HTMLImageElement;
  pagoda: HTMLImageElement;
  tree: HTMLImageElement;
  wall: HTMLImageElement;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`素材加载失败：${url}`));
    img.src = url;
  });
}

export async function loadAssets(prefix = "./assets/"): Promise<Assets> {
  const [far, pagoda, tree, wall] = await Promise.all([
    loadImage(`${prefix}far-range.webp`),
    loadImage(`${prefix}pagoda.webp`),
    loadImage(`${prefix}tree.webp`),
    loadImage(`${prefix}wall.webp`),
  ]);
  return { far, pagoda, tree, wall };
}

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

/**
 * 白底墨图 → 带 alpha 的墨层：alpha 由暗度决定，白即全透明。
 * 比 multiply 干净：不会留下一个方块。
 */
export function inkify(img: HTMLImageElement, strength = 1): HTMLCanvasElement {
  const c = makeCanvas(img.naturalWidth, img.naturalHeight);
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const a = Math.max(0, Math.min(1, ((252 - l) / 190) * strength));
    px[i + 3] = Math.round(a * 255);
  }
  g.putImageData(d, 0, 0);
  return c;
}

/** 把一张白底墨图染成单色剪影，用于「记忆里的塔」。 */
export function tintedSprite(img: HTMLImageElement | HTMLCanvasElement, color: string): HTMLCanvasElement {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const c = makeCanvas(iw, ih);
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
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

  for (let i = 0; i < 22; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 160 + rnd() * 420;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rnd() > 0.5 ? "rgba(206,190,158,0.09)" : "rgba(255,253,246,0.13)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  g.lineWidth = 1;
  for (let i = 0; i < 2200; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 8 + rnd() * 46;
    const ang = (rnd() - 0.5) * 0.45 + (rnd() > 0.88 ? 1.25 : 0);
    g.strokeStyle = rnd() > 0.55 ? "rgba(122,104,76,0.035)" : "rgba(255,255,250,0.085)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }

  const edge = g.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, "rgba(92,76,52,0.09)");
  edge.addColorStop(0.18, "rgba(92,76,52,0)");
  edge.addColorStop(0.82, "rgba(92,76,52,0)");
  edge.addColorStop(1, "rgba(92,76,52,0.11)");
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);

  return c;
}

// ————————————————————————————— 山 —————————————————————————————

/** 白底墨图按 multiply 压到纸上：白即透明，墨即留墨。 */
export function drawPlate(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  r: Rect,
  alpha = 1,
): void {
  g.save();
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = alpha;
  g.drawImage(img, r.x, r.y, r.w, r.h);
  g.restore();
}

function hillPath(g: CanvasRenderingContext2D, pts: readonly Pt[], bottom = STAGE.h + 20): void {
  g.beginPath();
  g.moveTo(pts[0].x, bottom);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    g.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 6, b.x, b.y);
  }
  g.lineTo(pts[pts.length - 1].x, bottom);
  g.closePath();
}

function hillBody(
  g: CanvasRenderingContext2D,
  pts: readonly Pt[],
  opts: { pattern?: HTMLImageElement; top?: string; mid?: string; edge?: number },
): void {
  const top = opts.top ?? "rgba(104,120,112,0.44)";
  const midC = opts.mid ?? "rgba(176,184,172,0.14)";
  hillPath(g, pts);
  const minY = Math.min(...pts.map((p) => p.y));
  const grad = g.createLinearGradient(0, minY, 0, minY + 360);
  grad.addColorStop(0, top);
  grad.addColorStop(0.5, midC);
  grad.addColorStop(1, "rgba(240,235,222,0)");
  g.fillStyle = grad;
  g.fill();

  if (opts.pattern) {
    g.save();
    g.clip();
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 0.55;
    const pat = g.createPattern(opts.pattern, "no-repeat");
    if (pat) {
      g.fillStyle = pat;
      g.fillRect(0, 0, STAGE.w, STAGE.h);
    }
    g.restore();
  }

  // 皴：顺着坡的短线
  g.save();
  g.clip();
  g.strokeStyle = "rgba(72,84,74,0.20)";
  g.lineWidth = 1.5;
  const rnd = mulberry32(404);
  for (let i = 0; i < 90; i++) {
    const x = 700 + rnd() * 900;
    const baseY = pts[0].y + 40 + rnd() * 210;
    const len = 12 + rnd() * 40;
    g.beginPath();
    g.moveTo(x, baseY);
    g.quadraticCurveTo(x + len * 0.4, baseY + 4, x + len, baseY + 10 + rnd() * 8);
    g.stroke();
  }
  g.restore();
}

/** 一道山：画到离屏、轻微模糊，边缘才像水洇开的，不像矢量。 */
export function bakeHill(
  pts: readonly Pt[],
  opts: { pattern?: HTMLImageElement; top?: string; mid?: string; edge?: number; blur?: number },
): HTMLCanvasElement {
  const c = makeCanvas(STAGE.w, STAGE.h);
  const g = c.getContext("2d")!;
  g.filter = `blur(${opts.blur ?? 2.6}px)`;
  hillBody(g, pts, opts);
  g.filter = "none";
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    g.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 6, b.x, b.y);
  }
  g.strokeStyle = `rgba(50,60,52,${opts.edge ?? 0.2})`;
  g.lineWidth = 1.6;
  g.stroke();
  return c;
}

/** 山脚的雾：三层横带叠出来，边缘才不硬。 */
export function drawMist(g: CanvasRenderingContext2D, y: number, height = 120, alpha = 0.9): void {
  g.save();
  const layers: Array<[number, number, number]> = [
    [y - height * 0.28, height * 1.5, alpha * 0.55],
    [y, height * 0.9, alpha * 0.75],
    [y + height * 0.26, height * 0.65, alpha * 0.6],
  ];
  for (const [cy, h, a] of layers) {
    const band = g.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    band.addColorStop(0, "rgba(244,239,227,0)");
    band.addColorStop(0.42, `rgba(244,239,227,${a})`);
    band.addColorStop(0.58, `rgba(244,239,227,${a})`);
    band.addColorStop(1, "rgba(244,239,227,0)");
    g.fillStyle = band;
    g.fillRect(0, cy - h / 2, STAGE.w, h);
  }
  g.restore();
}

// ————————————————————————————— 塔、树、墙 —————————————————————————————

export function drawPagodaSprite(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  r: Rect,
  alpha = 1,
): void {
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(img, r.x, r.y, r.w, r.h);
  g.restore();
}

export function drawTreeSprite(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  cx: number,
  baseY: number,
  width: number,
  alpha = 1,
): void {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const h = (width * ih) / iw;
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(img, cx - width / 2, baseY - h, width, h);
  g.restore();
}

export function drawWall(
  g: CanvasRenderingContext2D,
  l: number,
  r: number,
  top: number,
  opts: { bottom?: number; texture?: HTMLImageElement; broken?: boolean; seed?: number; shade?: number } = {},
): void {
  const bottom = opts.bottom ?? STAGE.h + 10;
  const rnd = mulberry32(opts.seed ?? 7);
  const h = bottom - top;
  g.save();
  g.beginPath();
  if (opts.broken) {
    g.moveTo(l, bottom);
    g.lineTo(l, top + 26);
    for (let x = l; x <= r; x += 14) {
      const t = (x - l) / Math.max(1, r - l);
      const jag = Math.sin(t * 9.1) * 16 + Math.sin(t * 22.3) * 8 + (rnd() - 0.5) * 7;
      g.lineTo(x, top + 22 + jag);
    }
    g.lineTo(r, bottom);
  } else {
    g.rect(l, top, r - l, h);
  }
  g.closePath();
  g.clip();

  const base = g.createLinearGradient(0, top, 0, bottom);
  base.addColorStop(0, "#faf5e8");
  base.addColorStop(0.5, "#f2ebdb");
  base.addColorStop(1, "#e7dcc6");
  g.fillStyle = base;
  g.fillRect(l, top, r - l, h);

  if (opts.texture) {
    g.save();
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 0.17;
    const pat = g.createPattern(opts.texture, "repeat");
    if (pat) {
      g.fillStyle = pat;
      g.translate(l - 40, top - 30);
      g.fillRect(0, 0, r - l + 80, h + 60);
    }
    g.restore();
  }

  const shade = g.createLinearGradient(0, top, 0, top + 120);
  shade.addColorStop(0, `rgba(46,50,44,${opts.shade ?? 0.22})`);
  shade.addColorStop(1, "rgba(46,50,44,0)");
  g.fillStyle = shade;
  g.fillRect(l, top, r - l, 120);

  const damp = g.createLinearGradient(0, bottom - 210, 0, bottom);
  damp.addColorStop(0, "rgba(86,80,62,0)");
  damp.addColorStop(1, "rgba(86,80,62,0.20)");
  g.fillStyle = damp;
  g.fillRect(l, bottom - 210, r - l, 210);
  g.restore();

  // 黛瓦：一条压边的瓦带 + 瓦当
  g.save();
  g.beginPath();
  if (opts.broken) {
    g.moveTo(l, top + 20);
    for (let x = l; x <= r; x += 14) {
      const t = (x - l) / Math.max(1, r - l);
      const jag = Math.sin(t * 9.1) * 16 + Math.sin(t * 22.3) * 8;
      g.lineTo(x, top + jag);
    }
    g.lineTo(r, top + 20);
    g.closePath();
  } else {
    g.rect(l, top - 13, r - l, 17);
  }
  g.fillStyle = "#4a4f47";
  g.fill();
  g.restore();

  if (!opts.broken) {
    g.save();
    g.fillStyle = "rgba(250,246,236,0.42)";
    g.fillRect(l, top - 13, r - l, 2.2);
    g.fillStyle = "rgba(30,34,30,0.30)";
    g.fillRect(l, top + 2, r - l, 3);
    // 瓦当
    g.fillStyle = "rgba(74,79,71,0.9)";
    for (let x = l + 12; x < r; x += 24) {
      g.beginPath();
      g.ellipse(x, top - 1, 4.2, 4.6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

/**
 * 断墙：塌了一半的土墙。左高右低，断口是砖茬，不是一条直线。
 */
export function drawRuin(g: CanvasRenderingContext2D, l: number, r: number, top: number, h: number): void {
  const w = r - l;
  const rnd = mulberry32(613);
  const bottom = top + h;
  g.save();

  g.beginPath();
  g.moveTo(l, bottom);
  g.lineTo(l, top + 18);
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = l + w * t;
    const drop = 26 * t + 74 * t * t;
    const jag = (i % 2 === 0 ? 1 : -1) * (6 + rnd() * 12);
    g.lineTo(x, top + 18 + drop + jag);
  }
  g.lineTo(r, bottom);
  g.closePath();

  const body = g.createLinearGradient(0, top, 0, bottom);
  body.addColorStop(0, "#cdc0a4");
  body.addColorStop(0.45, "#bfb195");
  body.addColorStop(1, "#a89a7e");
  g.fillStyle = body;
  g.fill();

  g.save();
  g.clip();
  // 夯土横层
  g.strokeStyle = "rgba(96,86,66,0.16)";
  g.lineWidth = 1.6;
  for (let y = top + 30; y < bottom; y += 17) {
    g.beginPath();
    g.moveTo(l, y);
    g.bezierCurveTo(l + w * 0.3, y - 3, l + w * 0.7, y + 3, r, y);
    g.stroke();
  }
  // 水渍与霉
  for (let i = 0; i < 90; i++) {
    const x = l + rnd() * w;
    const y = top + 20 + rnd() * h;
    g.globalAlpha = 0.04 + rnd() * 0.12;
    g.fillStyle = rnd() > 0.5 ? "#6f654f" : "#8a7f66";
    g.beginPath();
    g.ellipse(x, y, 3 + rnd() * 16, 2 + rnd() * 9, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // 墙脚压深
  const foot = g.createLinearGradient(0, bottom - 70, 0, bottom);
  foot.addColorStop(0, "rgba(70,62,46,0)");
  foot.addColorStop(1, "rgba(70,62,46,0.34)");
  g.globalAlpha = 1;
  g.fillStyle = foot;
  g.fillRect(l, bottom - 70, w, 70);
  g.restore();

  // 断口的砖茬
  g.strokeStyle = "rgba(74,66,50,0.55)";
  g.lineWidth = 2;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const x = l + w * t;
    const drop = 26 * t + 74 * t * t;
    g.beginPath();
    g.moveTo(x + 4, top + 18 + drop + 4);
    g.lineTo(x + 10, top + 18 + drop + 12);
    g.stroke();
  }

  // 投影
  const shadow = g.createLinearGradient(l - 30, 0, l + 10, 0);
  shadow.addColorStop(0, "rgba(60,54,40,0)");
  shadow.addColorStop(1, "rgba(60,54,40,0.18)");
  g.fillStyle = shadow;
  g.fillRect(l - 30, top + 40, 40, h - 40);
  g.restore();
}

// ————————————————————————————— 栏、柱、檐、水 —————————————————————————————

export function drawEave(g: CanvasRenderingContext2D, eaveY: number): void {
  g.save();
  const grad = g.createLinearGradient(0, eaveY - 26, 0, eaveY + 32);
  grad.addColorStop(0, "#22271f");
  grad.addColorStop(0.55, "#333a2f");
  grad.addColorStop(1, "#49503f");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, eaveY - 26);
  g.lineTo(STAGE.w, eaveY - 26);
  g.lineTo(STAGE.w, eaveY + 28);
  g.lineTo(0, eaveY + 34);
  g.closePath();
  g.fill();

  // 檐口的一点亮：瓦当的受光面
  g.strokeStyle = "rgba(226,218,196,0.34)";
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(0, eaveY + 30);
  g.lineTo(STAGE.w, eaveY + 26);
  g.stroke();

  // 椽头
  g.fillStyle = "rgba(196,186,160,0.30)";
  for (let x = 14; x < STAGE.w; x += 30) {
    g.beginPath();
    g.ellipse(x, eaveY + 26, 4.2, 3.2, 0, 0, Math.PI * 2);
    g.fill();
  }
  // 檐下阴影
  const sh = g.createLinearGradient(0, eaveY + 30, 0, eaveY + 120);
  sh.addColorStop(0, "rgba(26,30,26,0.34)");
  sh.addColorStop(1, "rgba(26,30,26,0)");
  g.fillStyle = sh;
  g.fillRect(0, eaveY + 30, STAGE.w, 90);
  g.restore();
}

export function drawPosts(g: CanvasRenderingContext2D, pillarL: number, pillarR: number, fromY: number, footY: number): void {
  for (const x of [pillarL, pillarR]) {
    g.save();
    const grad = g.createLinearGradient(x, 0, x + 26, 0);
    grad.addColorStop(0, "#3f3229");
    grad.addColorStop(0.35, "#6d5647");
    grad.addColorStop(0.62, "#543f33");
    grad.addColorStop(1, "#2e251f");
    g.fillStyle = grad;
    g.fillRect(x, fromY, 26, footY - fromY);
    g.fillStyle = "rgba(18,14,12,0.35)";
    g.fillRect(x + 21, fromY, 5, footY - fromY);
    g.fillStyle = "rgba(246,241,229,0.12)";
    g.fillRect(x + 3, fromY, 3, footY - fromY);
    g.fillStyle = "#6a6d63";
    g.fillRect(x - 8, footY - 16, 42, 22);
    g.fillStyle = "rgba(30,34,30,0.25)";
    g.fillRect(x - 8, footY + 4, 42, 4);
    g.restore();
  }
}

export function drawRail(g: CanvasRenderingContext2D, railY: number): void {
  const bottom = STAGE.h + 10;
  g.save();
  const body = g.createLinearGradient(0, railY, 0, bottom);
  body.addColorStop(0, "#eae2ce");
  body.addColorStop(1, "#d9cdb4");
  g.fillStyle = body;
  g.fillRect(0, railY, STAGE.w, bottom - railY);

  // 上枋
  g.fillStyle = "#cfc4ab";
  g.fillRect(0, railY, STAGE.w, 15);
  g.fillStyle = "rgba(250,247,238,0.45)";
  g.fillRect(0, railY, STAGE.w, 3);
  g.fillStyle = "rgba(72,66,52,0.22)";
  g.fillRect(0, railY + 15, STAGE.w, 3);

  // 望柱
  for (let x = 20; x < STAGE.w; x += 132) {
    g.fillStyle = "#cfc4ab";
    g.fillRect(x - 9, railY - 12, 20, 46);
    g.fillStyle = "rgba(250,247,238,0.5)";
    g.fillRect(x - 9, railY - 12, 4, 46);
    g.beginPath();
    g.ellipse(x + 1, railY - 16, 10, 7, 0, 0, Math.PI * 2);
    g.fillStyle = "#c8bda4";
    g.fill();
  }

  // 栏板下的暗
  const shade = g.createLinearGradient(0, railY + 18, 0, railY + 110);
  shade.addColorStop(0, "rgba(74,68,54,0.16)");
  shade.addColorStop(1, "rgba(74,68,54,0)");
  g.fillStyle = shade;
  g.fillRect(0, railY + 18, STAGE.w, 110);
  g.restore();
}

export function drawWater(
  g: CanvasRenderingContext2D,
  top: number,
  opts: { reflect?: { img: HTMLImageElement | HTMLCanvasElement; x: number; w: number; h: number }; alpha?: number } = {},
): void {
  const a = opts.alpha ?? 1;
  g.save();
  g.globalAlpha = a;
  const grad = g.createLinearGradient(0, top, 0, STAGE.h);
  grad.addColorStop(0, "#e4e7d9");
  grad.addColorStop(0.28, "#d2d9cd");
  grad.addColorStop(1, "#b6c2b8");
  g.fillStyle = grad;
  g.fillRect(0, top, STAGE.w, STAGE.h - top);
  // 远岸：一条压深的岸线，水才有边
  g.fillStyle = "rgba(86,96,84,0.26)";
  g.fillRect(0, top - 2, STAGE.w, 3);
  g.fillStyle = "rgba(250,247,238,0.35)";
  g.fillRect(0, top + 1, STAGE.w, 2);

  if (opts.reflect) {
    const { img, x, w, h } = opts.reflect;
    const tmp = makeCanvas(Math.round(w), Math.round(h));
    const tg = tmp.getContext("2d")!;
    tg.translate(0, h);
    tg.scale(1, -1);
    tg.drawImage(img, 0, 0, w, h);
    g.globalAlpha = a * 0.24;
    for (let y = 0; y < h; y += 4) {
      const dx = Math.sin((y + top) / 11) * 4 + Math.sin(y / 3.4) * 1.4;
      g.drawImage(tmp, 0, h - y - 4, w, 4, x - w / 2 + dx, top + y, w, 4);
    }
    g.globalAlpha = a;
  }

  g.strokeStyle = "rgba(250,247,238,0.50)";
  g.lineWidth = 1.5;
  for (let i = 0; i < 30; i++) {
    const y = top + 7 + i * 8.6;
    const w = 50 + (i % 6) * 30;
    const x = ((i * 211) % STAGE.w) - 40;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w, y);
    g.stroke();
  }
  g.strokeStyle = "rgba(70,80,72,0.14)";
  for (let i = 0; i < 20; i++) {
    const y = top + 13 + i * 11.5;
    const x = ((i * 383) % STAGE.w) - 70;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 110 + (i % 5) * 70, y);
    g.stroke();
  }
  g.restore();
}

export function drawTower(g: CanvasRenderingContext2D, x: number, alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  const w = 440;
  const top = 236;
  const grad = g.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#9aa1a3");
  grad.addColorStop(0.55, "#828a8d");
  grad.addColorStop(1, "#6d7578");
  g.fillStyle = grad;
  g.fillRect(x, top, w, STAGE.h - top);
  g.strokeStyle = "rgba(243,238,226,0.34)";
  g.lineWidth = 1.3;
  for (let yy = top + 22; yy < STAGE.h; yy += 28) {
    for (let xx = x + 14; xx < x + w - 10; xx += 26) {
      g.strokeRect(xx, yy, 14, 15);
    }
  }
  g.fillStyle = "rgba(243,238,226,0.10)";
  g.fillRect(x, top, 6, STAGE.h - top);
  g.restore();
}

export function drawSeal(g: CanvasRenderingContext2D, cx: number, cy: number, size: number, chars: string[], alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy);
  g.fillStyle = PAL.zhu;
  const r = size * 0.07;
  g.beginPath();
  g.moveTo(-size / 2 + r, -size / 2);
  g.arcTo(size / 2, -size / 2, size / 2, size / 2, r);
  g.arcTo(size / 2, size / 2, -size / 2, size / 2, r);
  g.arcTo(-size / 2, size / 2, -size / 2, -size / 2, r);
  g.arcTo(-size / 2, -size / 2, size / 2, -size / 2, r);
  g.closePath();
  g.fill();
  g.save();
  g.globalCompositeOperation = "source-atop";
  const rnd = mulberry32(17);
  for (let i = 0; i < 220; i++) {
    g.globalAlpha = rnd() * 0.16;
    g.fillStyle = i % 2 ? "#efe7d6" : "#5c1b13";
    g.fillRect(-size / 2 + rnd() * size, -size / 2 + rnd() * size, 1 + rnd() * 2.4, 1 + rnd() * 2.4);
  }
  g.restore();
  g.fillStyle = "#f7f1e4";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${size * 0.42}px "Jieshan Serif", serif`;
  if (chars.length >= 2) {
    g.fillText(chars[0], 0, -size * 0.2);
    g.fillText(chars[1], 0, size * 0.22);
  } else {
    g.fillText(chars[0] ?? "", 0, 0);
  }
  g.restore();
}

export function drawFrame(g: CanvasRenderingContext2D, r: Rect, ok: boolean): void {
  g.save();
  g.strokeStyle = ok ? PAL.gold : "rgba(52,58,52,0.55)";
  g.lineWidth = ok ? 2.4 : 1.4;
  g.setLineDash(ok ? [] : [14, 9]);
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.setLineDash([]);
  const L = 30;
  g.lineWidth = ok ? 3.4 : 2.4;
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

/** 调试：把判据用的山脊线画出来（?ridge=1） */
export function drawRidgeDebug(g: CanvasRenderingContext2D): void {
  g.save();
  g.strokeStyle = "#d33";
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= STAGE.w; x += 8) {
    const y = ridgeY(x);
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}
