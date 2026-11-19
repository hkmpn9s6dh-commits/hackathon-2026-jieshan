// 借山 · 几何内核
// 这里只放纯函数：渲染与判据共用同一份几何，避免「看起来对了」和「判过」两套标准。

export const STAGE = { w: 1600, h: 900 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Pt {
  x: number;
  y: number;
}

export interface Check {
  id: string;
  ok: boolean;
  /** 给玩家看的一句话（不含数字） */
  label: string;
  /** 给举证看的一行数字 */
  value: string;
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

export function rectCx(r: Rect): number {
  return r.x + r.w / 2;
}
export function rectCy(r: Rect): number {
  return r.y + r.h / 2;
}

export function rectIntersectionArea(a: Rect, b: Rect): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  if (x1 <= x0 || y1 <= y0) return 0;
  return (x1 - x0) * (y1 - y0);
}

export function rectArea(a: Rect): number {
  return a.w * a.h;
}

export function insideWithMargin(outer: Rect, inner: Rect, margin = 0): boolean {
  return (
    inner.x >= outer.x + margin &&
    inner.y >= outer.y + margin &&
    inner.x + inner.w <= outer.x + outer.w - margin &&
    inner.y + inner.h <= outer.y + outer.h - margin
  );
}

export function centerDistance(a: Rect, b: Rect): number {
  return Math.hypot(rectCx(a) - rectCx(b), rectCy(a) - rectCy(b));
}

/** 惠山山脊：中部隆起，两端渐落。渲染与判据共用这一条线。 */
const RIDGE_PTS: readonly Pt[] = [
  { x: -60, y: 380 },
  { x: 80, y: 368 },
  { x: 160, y: 322 },
  { x: 240, y: 200 },
  { x: 320, y: 186 },
  { x: 400, y: 220 },
  { x: 480, y: 232 },
  { x: 560, y: 232 },
  { x: 640, y: 226 },
  { x: 720, y: 222 },
  { x: 800, y: 236 },
  { x: 880, y: 268 },
  { x: 960, y: 284 },
  { x: 1040, y: 262 },
  { x: 1120, y: 216 },
  { x: 1200, y: 182 },
  { x: 1280, y: 186 },
  { x: 1360, y: 210 },
  { x: 1440, y: 222 },
  { x: 1520, y: 240 },
  { x: 1700, y: 336 },
];

export function ridgeY(x: number): number {
  const p = RIDGE_PTS;
  if (x <= p[0].x) return p[0].y;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i];
    const b = p[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      // smoothstep，山脊才不会有折角
      const s = t * t * (3 - 2 * t);
      return a.y + (b.y - a.y) * s;
    }
  }
  return p[p.length - 1].y;
}

/** 区间内山脊到墙头的最小间距（正数＝山脊在上）。 */
export function ridgeMinGap(x0: number, x1: number, wallTop: number, samples = 96): number {
  let min = Infinity;
  for (let i = 0; i < samples; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / samples;
    min = Math.min(min, wallTop - ridgeY(x));
  }
  return min;
}

/** 一段区间里，山脊高过墙头（y 更小）的比例。 */
export function ridgeAboveWallFraction(x0: number, x1: number, wallTop: number, samples = 64): number {
  let n = 0;
  for (let i = 0; i < samples; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / samples;
    if (ridgeY(x) < wallTop) n++;
  }
  return n / samples;
}

// ————————————————————————————— 第 1 关 · 凤谷行窝 —————————————————————————————

export interface S1 {
  /** 墙头（越小越高） */
  wallTop: number;
  /** 树的横坐标中心 */
  treeX: number;
}

export const L1_WALL = { L: 260, R: 1340 };
export const TREE_CANOPY_HALF = 210;
export const L1_BOUNDS = {
  wallTop: { min: 300, max: 660 },
  treeX: { min: 300, max: 1120 },
};
/** 山脊与墙头之间至少要留这么宽的一条（最窄处） */
export const L1_MARGIN = 26;
/** 墙不能太矮（墙头不得低于这条线），否则不成其为墙 */
export const L1_WALL_FLOOR = 560;
/** 山最矮的一段（天际线的缺口）：树要挡在这里 */
export const L1_DIP_X = 962;
export const L1_DIP_TOL = 72;

export function measure1(s: S1): Check[] {
  const spanL = L1_WALL.L + 120;
  const spanR = L1_WALL.R - 120;
  const gap = ridgeMinGap(spanL, spanR, s.wallTop);

  const dipOff = Math.abs(s.treeX - L1_DIP_X);

  return [
    {
      id: "l1-ridge",
      ok: gap >= L1_MARGIN,
      label: "山脊整条高过墙头",
      value: `minGap=${gap.toFixed(1)} (>=${L1_MARGIN})`,
    },
    {
      id: "l1-dip",
      ok: dipOff <= L1_DIP_TOL,
      label: "树挡在山最矮的一段",
      value: `|treeX-${L1_DIP_X}|=${dipOff.toFixed(0)} (<=${L1_DIP_TOL})`,
    },
    {
      id: "l1-wall",
      ok: s.wallTop <= L1_WALL_FLOOR,
      label: "墙要立得住",
      value: `wallTop=${s.wallTop.toFixed(0)} (<=${L1_WALL_FLOOR})`,
    },
  ];
}

// ————————————————————————————— 第 2 关 · 寄畅园 —————————————————————————————
// 塔是墙外的（锡山龙光塔），位置不动。玩家挪两根廊柱、檐口与石栏。

/** 塔是竖图（924x1330），框比要守住 0.695，否则会被压扁 */
export const PAGODA = rect(990, 150, 174, 250);

export interface S2 {
  pillarL: number;
  pillarR: number;
  eaveY: number;
  /** 山脚的雾：把塔脚埋住 */
  mistY: number;
}

export const L2_MIST_H = 96;
export const L2_BOUNDS = {
  pillarL: { min: 300, max: 760 },
  pillarR: { min: 860, max: 1360 },
  eaveY: { min: 80, max: 170 },
  mistY: { min: 330, max: 470 },
};
export const PILLAR_W = 26;

export function measure2(s: S2): Check[] {
  const innerL = s.pillarL + PILLAR_W;
  const innerR = s.pillarR;
  const gapOk = PAGODA.x >= innerL + 24 && PAGODA.x + PAGODA.w <= innerR - 24;
  const gap = innerR - innerL;
  const eaveBottom = s.eaveY + 34;
  const eaveOk = PAGODA.y >= eaveBottom + 12;
  const base = PAGODA.y + PAGODA.h;
  const mistTop = s.mistY - L2_MIST_H / 2;
  const mistBottom = s.mistY + L2_MIST_H / 2;
  const baseHidden = mistTop <= base - 24 && mistBottom >= base + 12;
  return [
    {
      id: "l2-gap",
      ok: gapOk,
      label: "塔要整个落在两柱之间",
      value: `pagoda=[${PAGODA.x},${PAGODA.x + PAGODA.w}] gap=[${innerL.toFixed(0)},${innerR.toFixed(0)}] need>=24px margin (gap=${gap.toFixed(0)})`,
    },
    {
      id: "l2-eave",
      ok: eaveOk,
      label: "塔尖不许碰檐口",
      value: `pagodaTop=${PAGODA.y} eaveBottom=${eaveBottom.toFixed(0)} need>=12px`,
    },
    {
      id: "l2-base",
      ok: baseHidden,
      label: "雾要埋住塔脚",
      value: `mist=[${mistTop.toFixed(0)},${mistBottom.toFixed(0)}] pagodaBase=${base} need mistTop<=${base - 24} && mistBottom>=${base + 12}`,
    },
  ];
}

// ————————————————————————————— 第 3 关 · 携图以归 —————————————————————————————
// 把园子借进一张画：画幅 3:2，塔落在右上三分，水面落在下三分。

export const L3_WATER_Y = 596;

export interface S3 {
  fx: number;
  fy: number;
  fw: number;
  fh: number;
}

export const L3_BOUNDS = {
  fx: { min: 20, max: 720 },
  fy: { min: 20, max: 260 },
  fw: { min: 520, max: 1060 },
};

export function measure3(s: S3): Check[] {
  const frame = rect(s.fx, s.fy, s.fw, s.fh);
  const aspect = s.fw / s.fh;
  const inside = insideWithMargin(rect(1, 1, STAGE.w - 2, STAGE.h - 2), frame, 0);
  const pagodaIn = insideWithMargin(frame, PAGODA, 0);
  const rx = (rectCx(PAGODA) - frame.x) / frame.w;
  const ry = (rectCy(PAGODA) - frame.y) / frame.h;
  const thirdX = rx >= 0.58 && rx <= 0.74;
  const thirdY = ry >= 0.2 && ry <= 0.4;
  const wy = (L3_WATER_Y - frame.y) / frame.h;
  const waterOk = wy >= 0.58 && wy <= 0.7;
  return [
    {
      id: "l3-aspect",
      ok: Math.abs(aspect - 1.5) <= 0.02,
      label: "画幅三比二",
      value: `aspect=${aspect.toFixed(3)} (1.480..1.520)`,
    },
    {
      id: "l3-inside",
      ok: inside,
      label: "画在纸内",
      value: `frame=[${s.fx.toFixed(0)},${s.fy.toFixed(0)},${s.fw.toFixed(0)},${s.fh.toFixed(0)}] inside=${inside}`,
    },
    {
      id: "l3-pagoda",
      ok: pagodaIn && thirdX && thirdY,
      label: "塔在画的右上三分",
      value: `pagodaIn=${pagodaIn} rel=(${rx.toFixed(3)},${ry.toFixed(3)}) need x 0.580..0.740 y 0.200..0.400`,
    },
    {
      id: "l3-water",
      ok: waterOk,
      label: "水在下三分",
      value: `waterRel=${wy.toFixed(3)} (0.580..0.700)`,
    },
  ];
}

// ————————————————————————————— 第 4 关 · 庚申 —————————————————————————————
// 只剩一段断墙。墙要低、要让开塔、还要给水留一条。

export interface S4 {
  wallX: number;
  /** 墙头 y（越小越高） */
  wallTopY: number;
}

export const L4_WALL_W = 236;
export const L4_WALL_H = 300;
/** 场景里水面的一条线，供画与判据共用 */
export const XISHAN_PTS: readonly Pt[] = [
  { x: 760, y: 700 },
  { x: 860, y: 612 },
  { x: 950, y: 540 },
  { x: 1010, y: 448 },
  { x: 1077, y: 398 },
  { x: 1150, y: 462 },
  { x: 1230, y: 556 },
  { x: 1320, y: 606 },
  { x: 1440, y: 642 },
  { x: 1700, y: 676 },
];

export function xishanY(x: number): number {
  const p = XISHAN_PTS;
  if (x <= p[0].x) return p[0].y;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i];
    const b = p[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return p[p.length - 1].y;
}
export const L4_WATER_Y = 690;
export const L4_BOUNDS = {
  wallX: { min: 120, max: 1320 },
  wallTopY: { min: 300, max: 520 },
};

export function measure4(s: S4): Check[] {
  const wall = rect(s.wallX, s.wallTopY, L4_WALL_W, L4_WALL_H);
  const lowOk = s.wallTopY >= PAGODA.y + (PAGODA.h * 2) / 3;
  const clearOk = rectIntersectionArea(wall, PAGODA) === 0;
  const waterOk = s.wallTopY + L4_WALL_H <= L4_WATER_Y + 36;
  return [
    {
      id: "l4-low",
      ok: lowOk,
      label: "墙头低过塔身三分之二",
      value: `wallTop=${s.wallTopY.toFixed(0)} need>=${(PAGODA.y + (PAGODA.h * 2) / 3).toFixed(0)}`,
    },
    {
      id: "l4-clear",
      ok: clearOk,
      label: "让开塔",
      value: `overlapArea=${rectIntersectionArea(wall, PAGODA)} (==0)`,
    },
    {
      id: "l4-water",
      ok: waterOk,
      label: "给水留一条",
      value: `wallBottom=${(s.wallTopY + L4_WALL_H).toFixed(0)} need<=${L4_WATER_Y + 36}`,
    },
  ];
}

// ————————————————————————————— 第 5 关 · 回借 —————————————————————————————
// 墙外起了高楼。把记忆里的塔放回原处，让楼退开。

export const MEM_TARGET = rect(PAGODA.x, PAGODA.y, PAGODA.w, PAGODA.h);
export const TOWER = rect(940, 236, 440, 664);

export interface S5 {
  memX: number;
  memY: number;
  towerX: number;
}

export const L5_BOUNDS = {
  memX: { min: 640, max: 1500 },
  memY: { min: 100, max: 420 },
  towerX: { min: 700, max: 1560 },
};

export function measure5(s: S5): Check[] {
  const mem = rect(s.memX, s.memY, PAGODA.w, PAGODA.h);
  const tower = rect(s.towerX, TOWER.y, TOWER.w, TOWER.h);
  const dist = centerDistance(mem, MEM_TARGET);
  const visible = Math.max(0, STAGE.w - tower.x) / STAGE.w;
  const covered = rectIntersectionArea(tower, mem);
  return [
    {
      id: "l5-place",
      ok: dist <= 26,
      label: "放回它原来站的地方",
      value: `centerDist=${dist.toFixed(1)} (<=26)`,
    },
    {
      id: "l5-visible",
      ok: visible <= 0.22,
      label: "让楼退出画面",
      value: `towerVisible=${visible.toFixed(3)} (<=0.220)`,
    },
    {
      id: "l5-cover",
      ok: covered === 0,
      label: "楼不能压住塔",
      value: `coveredArea=${covered} (==0)`,
    },
  ];
}
