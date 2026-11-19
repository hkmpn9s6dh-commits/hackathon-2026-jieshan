// 借山 · 主程序。五关，一个动作。

import { STAGE, type Rect, type Check } from "./geo.ts";
import * as G from "./geo.ts";
import { LEVELS, COVER, END, QUOTES, SOURCES, AI_NOTE } from "./text.ts";
import * as P from "./paint.ts";

type Screen = "cover" | "play" | "end";

interface State {
  screen: Screen;
  level: number;
  s1: G.S1;
  s2: G.S2;
  s3: G.S3;
  s4: G.S4;
  s5: G.S5;
  solved: boolean[];
  snaps: Array<string | null>;
}

const state: State = {
  screen: "cover",
  level: 1,
  s1: { wallTop: 596, treeX: 470 },
  s2: { pillarL: 360, pillarR: 892, eaveY: 148, mistY: 420 },
  s3: { fx: 150, fy: 74, fw: 820, fh: 500 },
  s4: { wallX: 300, wallTopY: 336 },
  s5: { memX: 720, memY: 388, towerX: 940 },
  solved: [false, false, false, false, false],
  snaps: [null, null, null, null, null],
};

function checks(n = state.level): Check[] {
  switch (n) {
    case 1:
      return G.measure1(state.s1);
    case 2:
      return G.measure2(state.s2);
    case 3:
      return G.measure3(state.s3);
    case 4:
      return G.measure4(state.s4);
    default:
      return G.measure5(state.s5);
  }
}

function allOk(n = state.level): boolean {
  return checks(n).every((c) => c.ok);
}

// ————————————————————————————— 画布 —————————————————————————————

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let dpr = Math.min(2, window.devicePixelRatio || 1);
let paper: HTMLCanvasElement;
let assets: P.Assets;
let ghostSel: HTMLCanvasElement;
let hill: HTMLCanvasElement;
let inkPagoda: HTMLCanvasElement;
let inkTree: HTMLCanvasElement;

function buildLayers(): void {
  paper = P.paintPaper();
  inkPagoda = P.inkify(assets.pagoda);
  inkTree = P.inkify(assets.tree);
  ghostSel = P.tintedSprite(inkPagoda, P.PAL.zhu);
  hill = P.bakeHill(G.XISHAN_PTS, {
    pattern: assets.far,
    top: "rgba(116,130,120,0.13)",
    mid: "rgba(190,194,180,0.05)",
    edge: 0.0,
    blur: 9,
  });
}

function resize(): void {
  const pad = 0;
  const vw = window.innerWidth - pad * 2;
  const vh = window.innerHeight - pad * 2;
  const scale = Math.min(vw / STAGE.w, vh / STAGE.h);
  const w = Math.round(STAGE.w * scale);
  const h = Math.round(STAGE.h * scale);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(STAGE.w * dpr);
  canvas.height = Math.round(STAGE.h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = "high";
}

// ————————————————————————————— 交互 —————————————————————————————

interface Handle {
  id: string;
  hit: Rect;
  axis: "x" | "y" | "xy";
  resize?: boolean;
  label: string;
}

function handles(n = state.level): Handle[] {
  switch (n) {
    case 1:
      return [
        { id: "wallTop", axis: "y", label: "墙", hit: { x: G.L1_WALL.L - 20, y: state.s1.wallTop - 40, w: G.L1_WALL.R - G.L1_WALL.L + 40, h: 80 } },
        { id: "treeX", axis: "x", label: "树", hit: { x: state.s1.treeX - 200, y: 130, w: 400, h: 360 } },
      ];
    case 2:
      return [
        { id: "pillarL", axis: "x", label: "左柱", hit: { x: state.s2.pillarL - 26, y: 190, w: 78, h: 690 } },
        { id: "pillarR", axis: "x", label: "右柱", hit: { x: state.s2.pillarR - 26, y: 190, w: 78, h: 690 } },
        { id: "eaveY", axis: "y", label: "檐口", hit: { x: 0, y: state.s2.eaveY - 44, w: STAGE.w, h: 92 } },
        { id: "mistY", axis: "y", label: "雾", hit: { x: 0, y: state.s2.mistY - 48, w: STAGE.w, h: 96 } },
      ];
    case 3:
      return [
        { id: "frame", axis: "xy", label: "画框", hit: { x: state.s3.fx, y: state.s3.fy, w: state.s3.fw, h: state.s3.fh } },
        {
          id: "corner",
          axis: "xy",
          resize: true,
          label: "右下角",
          hit: { x: state.s3.fx + state.s3.fw - 46, y: state.s3.fy + state.s3.fh - 46, w: 92, h: 92 },
        },
      ];
    case 4:
      return [{ id: "wall", axis: "xy", label: "断墙", hit: { x: state.s4.wallX - 10, y: state.s4.wallTopY - 20, w: G.L4_WALL_W + 20, h: G.L4_WALL_H + 30 } }];
    default:
      return [
        { id: "mem", axis: "xy", label: "记忆里的塔", hit: { x: state.s5.memX - 24, y: state.s5.memY - 24, w: G.PAGODA.w + 48, h: G.PAGODA.h + 48 } },
        { id: "tower", axis: "x", label: "楼", hit: { x: state.s5.towerX, y: G.TOWER.y, w: G.TOWER.w, h: G.STAGE.h - G.TOWER.y } },
      ];
  }
}

let drag: { id: string; px: number; py: number; base: Record<string, number> } | null = null;
let hot: string | null = null;

function toStage(e: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * STAGE.w, y: ((e.clientY - r.top) / r.height) * STAGE.h };
}

function pick(x: number, y: number): Handle | null {
  const hs = handles();
  for (let i = hs.length - 1; i >= 0; i--) {
    const h = hs[i].hit;
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return hs[i];
  }
  return null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function apply(handle: Handle, dx: number, dy: number): void {
  const n = state.level;
  if (n === 1) {
    if (handle.id === "wallTop") state.s1.wallTop = clamp(state.s1.wallTop + dy, G.L1_BOUNDS.wallTop.min, G.L1_BOUNDS.wallTop.max);
    if (handle.id === "treeX") state.s1.treeX = clamp(state.s1.treeX + dx, G.L1_BOUNDS.treeX.min, G.L1_BOUNDS.treeX.max);
  } else if (n === 2) {
    if (handle.id === "pillarL") state.s2.pillarL = clamp(state.s2.pillarL + dx, G.L2_BOUNDS.pillarL.min, G.L2_BOUNDS.pillarL.max);
    if (handle.id === "pillarR") state.s2.pillarR = clamp(state.s2.pillarR + dx, G.L2_BOUNDS.pillarR.min, G.L2_BOUNDS.pillarR.max);
    if (handle.id === "eaveY") state.s2.eaveY = clamp(state.s2.eaveY + dy, G.L2_BOUNDS.eaveY.min, G.L2_BOUNDS.eaveY.max);
    if (handle.id === "mistY") state.s2.mistY = clamp(state.s2.mistY + dy, G.L2_BOUNDS.mistY.min, G.L2_BOUNDS.mistY.max);
  } else if (n === 3) {
    if (handle.id === "corner") {
      state.s3.fw = clamp(state.s3.fw + dx, G.L3_BOUNDS.fw.min, G.L3_BOUNDS.fw.max);
      state.s3.fh = clamp(state.s3.fh + dy, 340, 860);
    } else if (handle.id === "frame") {
      state.s3.fx = clamp(state.s3.fx + dx, G.L3_BOUNDS.fx.min, G.L3_BOUNDS.fx.max);
      state.s3.fy = clamp(state.s3.fy + dy, G.L3_BOUNDS.fy.min, G.L3_BOUNDS.fy.max);
    }
  } else if (n === 4) {
    state.s4.wallX = clamp(state.s4.wallX + dx, G.L4_BOUNDS.wallX.min, G.L4_BOUNDS.wallX.max);
    state.s4.wallTopY = clamp(state.s4.wallTopY + dy, G.L4_BOUNDS.wallTopY.min, G.L4_BOUNDS.wallTopY.max);
  } else {
    if (handle.id === "mem") {
      state.s5.memX = clamp(state.s5.memX + dx, G.L5_BOUNDS.memX.min, G.L5_BOUNDS.memX.max);
      state.s5.memY = clamp(state.s5.memY + dy, G.L5_BOUNDS.memY.min, G.L5_BOUNDS.memY.max);
    }
    if (handle.id === "tower") {
      state.s5.towerX = clamp(state.s5.towerX + dx, G.L5_BOUNDS.towerX.min, G.L5_BOUNDS.towerX.max);
    }
  }
}

canvas.addEventListener("pointerdown", (e) => {
  if (state.screen !== "play") return;
  const p = toStage(e);
  const h = pick(p.x, p.y);
  if (!h) return;
  canvas.setPointerCapture(e.pointerId);
  drag = { id: h.id, px: p.x, py: p.y, base: {} };
  e.preventDefault();
  audio.unlock();
});

canvas.addEventListener("pointermove", (e) => {
  const p = toStage(e);
  if (!drag) {
    const h = pick(p.x, p.y);
    const id = h ? h.id : null;
    if (id !== hot) {
      hot = id;
      canvas.style.cursor = id ? (h!.axis === "x" ? "ew-resize" : h!.axis === "y" ? "ns-resize" : "move") : "default";
    }
    return;
  }
  const h = handles().find((x) => x.id === drag!.id);
  if (!h) return;
  apply(h, p.x - drag.px, p.y - drag.py);
  drag.px = p.x;
  drag.py = p.y;
  syncHud();
});

function endDrag(e: PointerEvent): void {
  if (!drag) return;
  drag = null;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  syncHud();
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// 键盘：Tab 焦点在画布上时，方向键微调，[ ] 切换手柄
let keyIndex = 0;
canvas.addEventListener("keydown", (e) => {
  if (state.screen !== "play") return;
  const hs = handles();
  if (e.key === "[" || e.key === "]") {
    keyIndex = (keyIndex + (e.key === "]" ? 1 : hs.length - 1)) % hs.length;
    syncHud();
    e.preventDefault();
    return;
  }
  const step = e.shiftKey ? 16 : 4;
  const h = hs[keyIndex % hs.length];
  let dx = 0;
  let dy = 0;
  if (e.key === "ArrowLeft") dx = -step;
  else if (e.key === "ArrowRight") dx = step;
  else if (e.key === "ArrowUp") dy = -step;
  else if (e.key === "ArrowDown") dy = step;
  else return;
  apply(h, dx, dy);
  syncHud();
  e.preventDefault();
});

// ————————————————————————————— 音 —————————————————————————————

const audio = {
  ctx: null as AudioContext | null,
  muted: false,
  unlock(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
    }
  },
  pluck(freq = 392, dur = 2.4, gain = 0.06): void {
    const ac = this.ctx;
    if (!ac || this.muted) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
};

// ————————————————————————————— 渲染 —————————————————————————————

let sealT = 0;
let flash = 0;

function vignette(): void {
  const g = ctx;
  const rg = g.createRadialGradient(STAGE.w / 2, STAGE.h * 0.46, STAGE.h * 0.3, STAGE.w / 2, STAGE.h * 0.5, STAGE.h * 0.95);
  rg.addColorStop(0, "rgba(60,50,34,0)");
  rg.addColorStop(1, "rgba(60,50,34,0.20)");
  g.fillStyle = rg;
  g.fillRect(0, 0, STAGE.w, STAGE.h);
}

function burntTint(): void {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(196,186,168,1)";
  ctx.fillRect(0, 0, STAGE.w, STAGE.h);
  ctx.restore();
  ctx.fillStyle = "rgba(120,108,88,0.10)";
  ctx.fillRect(0, 0, STAGE.w, STAGE.h);
}

function drawScene1(): void {
  P.drawPlate(ctx, assets.far, { x: 0, y: 0, w: STAGE.w, h: STAGE.h }, 0.95);
  P.drawTreeSprite(ctx, inkTree, state.s1.treeX, state.s1.wallTop + 150, 480, 0.94);
  P.drawWall(ctx, -20, STAGE.w + 20, state.s1.wallTop, { texture: assets.wall, seed: 3, shade: 0.26 });
}

function drawScene2(): void {
  P.drawPlate(ctx, assets.far, { x: 0, y: 0, w: STAGE.w, h: STAGE.h }, 0.92);
  P.drawPagodaSprite(ctx, inkPagoda, G.PAGODA, 0.97);
  P.drawMist(ctx, state.s2.mistY, G.L2_MIST_H * 1.5, 0.72);
  P.drawWater(ctx, 640, { alpha: 0.92 });
  P.drawRail(ctx, 762);
  P.drawPosts(ctx, state.s2.pillarL, state.s2.pillarR, state.s2.eaveY + 30, 762);
  P.drawEave(ctx, state.s2.eaveY);
}

function drawScene3(): void {
  const s = state.s3;
  P.drawPlate(ctx, assets.far, { x: 0, y: 0, w: STAGE.w, h: STAGE.h }, 0.9);
  P.drawPagodaSprite(ctx, inkPagoda, G.PAGODA, 0.95);
  P.drawWater(ctx, G.L3_WATER_Y, {
    reflect: { img: inkPagoda, x: G.PAGODA.x + G.PAGODA.w / 2, w: G.PAGODA.w, h: G.PAGODA.h * 0.9 },
  });
  const frame = { x: s.fx, y: s.fy, w: s.fw, h: s.fh };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, STAGE.w, STAGE.h);
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.fillStyle = "rgba(239,231,214,0.78)";
  ctx.fill("evenodd");
  ctx.restore();
  P.drawFrame(ctx, frame, allOk(3));
}

function drawScene4(): void {
  P.drawPlate(ctx, assets.far, { x: 0, y: 0, w: STAGE.w, h: STAGE.h }, 0.72);
  ctx.save();
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "rgba(128,128,128,1)";
  ctx.fillRect(0, 0, STAGE.w, STAGE.h);
  ctx.restore();
  ctx.fillStyle = "rgba(214,205,186,0.20)";
  ctx.fillRect(0, 0, STAGE.w, STAGE.h);


  P.drawWater(ctx, G.L4_WATER_Y, {
    reflect: { img: inkPagoda, x: G.PAGODA.x + G.PAGODA.w / 2, w: G.PAGODA.w, h: G.PAGODA.h * 0.8 },
    alpha: 0.8,
  });
  P.drawPagodaSprite(ctx, inkPagoda, G.PAGODA, 0.9);
  P.drawRuin(ctx, state.s4.wallX, state.s4.wallX + G.L4_WALL_W, state.s4.wallTopY, G.L4_WALL_H);
  const rnd = P.mulberry32(97);
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const x = rnd() * STAGE.w;
    const y = 120 + rnd() * 700;
    ctx.globalAlpha = 0.04 + rnd() * 0.12;
    ctx.fillStyle = "#3a342c";
    ctx.fillRect(x, y, 1.6 + rnd() * 2.4, 1.4);
  }
  ctx.restore();
}

function drawScene5(): void {
  P.drawPlate(ctx, assets.far, { x: 0, y: 0, w: STAGE.w, h: STAGE.h }, 0.78);
  P.drawWater(ctx, 620, { alpha: 0.92 });
  P.drawPagodaSprite(ctx, inkPagoda, G.PAGODA, allOk(5) ? 0.96 : 0.14);
  P.drawTower(ctx, state.s5.towerX, allOk(5) ? 0.18 : 1);
  P.drawPagodaSprite(ctx, ghostSel, { x: state.s5.memX, y: state.s5.memY, w: G.PAGODA.w, h: G.PAGODA.h }, allOk(5) ? 0.12 : 0.34);
}

function draw(): void {
  ctx.clearRect(0, 0, STAGE.w, STAGE.h);
  ctx.drawImage(paper, 0, 0);
  if (state.screen === "play") {
    if (state.level === 1) drawScene1();
    else if (state.level === 2) drawScene2();
    else if (state.level === 3) drawScene3();
    else if (state.level === 4) drawScene4();
    else drawScene5();

    if (sealT > 0) {
      const k = Math.min(1, sealT / 520);
      const s = 1 + (1 - k) * 0.7;
      ctx.save();
      ctx.globalAlpha = k * (1 - Math.max(0, (sealT - 1500) / 500));
      P.drawSeal(ctx, STAGE.w - 168, STAGE.h - 150, 132 * s, ["借", "山"]);
      ctx.restore();
    }
  }
  if (ridgeDebug) P.drawRidgeDebug(ctx);
  vignette();
  if (flash > 0) {
    ctx.fillStyle = `rgba(239,231,214,${flash})`;
    ctx.fillRect(0, 0, STAGE.w, STAGE.h);
  }
}

const ridgeDebug = new URLSearchParams(location.search).has("ridge");

let last = performance.now();
function loop(t: number): void {
  const dt = Math.min(64, t - last);
  last = t;
  if (sealT > 0) sealT += dt;
  if (flash > 0) flash = Math.max(0, flash - dt / 420);
  draw();
  requestAnimationFrame(loop);
}

// ————————————————————————————— DOM —————————————————————————————

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function syncHud(): void {
  const lv = LEVELS[state.level - 1];
  el("hud-era").textContent = `${lv.era} · ${lv.year}`;
  el("hud-name").textContent = lv.name;
  el("hud-idx").textContent = `${state.level} / 5`;
  el("task").textContent = state.screen === "play" ? lv.task : "";
  el("note").textContent = state.screen === "play" ? lv.note : "";

  const list = el("checks");
  const cs = checks();
  list.innerHTML = "";
  for (const c of cs) {
    const li = document.createElement("li");
    li.className = c.ok ? "ok" : "";
    li.innerHTML = `<i></i><span>${c.label}</span>`;
    li.title = c.value;
    list.appendChild(li);
  }

  const ok = cs.every((c) => c.ok);
  const btn = el<HTMLButtonElement>("seal");
  btn.hidden = !ok;
  btn.disabled = !ok;
  el("hint").hidden = ok || state.screen !== "play";
  document.body.classList.toggle("is-solved", ok && state.screen === "play");
  el("handles").textContent = lv.handles.join(" · ");
}

function showScreen(s: Screen): void {
  state.screen = s;
  el("cover").hidden = s !== "cover";
  el("end").hidden = s !== "end";
  el("hud").hidden = s !== "play";
  if (s === "end") renderEnd();
  syncHud();
}

function goLevel(n: number): void {
  state.level = n;
  keyIndex = 0;
  sealT = 0;
  flash = 0.9;
  if (state.screen !== "play") showScreen("play");
  syncHud();
}

function sealNow(): void {
  if (!allOk()) return;
  sealT = 1;
  audio.pluck(392, 3.0, 0.05);
  const snap = canvas.toDataURL("image/jpeg", 0.72);
  state.snaps[state.level - 1] = snap;
  state.solved[state.level - 1] = true;
  window.setTimeout(() => {
    if (state.level >= 5) {
      flash = 1;
      showScreen("end");
    } else {
      goLevel(state.level + 1);
    }
  }, 2100);
}

function renderEnd(): void {
  const strip = el("strip");
  strip.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.alt = `${LEVELS[i].year} ${LEVELS[i].name}`;
    if (state.snaps[i]) img.src = state.snaps[i]!;
    const cap = document.createElement("figcaption");
    cap.textContent = `${LEVELS[i].year} · ${LEVELS[i].name}`;
    fig.append(img, cap);
    strip.appendChild(fig);
  }
  const src = el("srclist");
  src.innerHTML = "";
  for (const s of SOURCES) {
    const li = document.createElement("li");
    li.innerHTML = `<b>${s.title}</b> —— ${s.detail} <a href="${s.url}" target="_blank" rel="noreferrer noopener">原文</a>`;
    src.appendChild(li);
  }
}

function composeScroll(): HTMLCanvasElement {
  const n = 5;
  const cw = 460;
  const ch = 300;
  const gap = 22;
  const pad = 46;
  const w = pad * 2 + cw * n + gap * (n - 1);
  const h = pad * 2 + ch + 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe7d6";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#1d2321";
  g.font = '28px "Jieshan Serif", serif';
  g.fillText("借山 · 五百年，五次取景", pad, pad + 6);
  g.font = '18px "Jieshan Serif", serif';
  g.fillStyle = "#4a524d";
  g.fillText("无锡寄畅园 · 1527—2026", pad, pad + 34);
  const top = pad + 56;
  for (let i = 0; i < n; i++) {
    const x = pad + i * (cw + gap);
    if (state.snaps[i]) {
      const img = new Image();
      img.src = state.snaps[i]!;
      // 同步绘制：用已解码的 dataURL 时浏览器通常已就绪
      try {
        g.drawImage(img, x, top, cw, (cw * 9) / 16);
      } catch {
        /* ignore */
      }
    }
    g.fillStyle = "#efe7d6";
    g.fillRect(x, top + (cw * 9) / 16, cw, 3);
    g.fillStyle = "#1d2321";
    g.font = '19px "Jieshan Serif", serif';
    g.fillText(`${LEVELS[i].year} · ${LEVELS[i].name}`, x, top + (cw * 9) / 16 + 30);
  }
  return c;
}

function download(name: string, dataUrl: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

function wire(): void {
  el("btn-start").addEventListener("click", () => {
    audio.unlock();
    goLevel(1);
  });
  el("seal").addEventListener("click", sealNow);
  el("btn-again").addEventListener("click", () => {
    state.solved = [false, false, false, false, false];
    state.snaps = [null, null, null, null, null];
    state.s1 = { wallTop: 596, treeX: 470 };
    state.s2 = { pillarL: 360, pillarR: 892, eaveY: 148, mistY: 420 };
    state.s3 = { fx: 150, fy: 74, fw: 820, fh: 500 };
    state.s4 = { wallX: 300, wallTopY: 336 };
    state.s5 = { memX: 720, memY: 388, towerX: 940 };
    goLevel(1);
  });
  el("btn-save").addEventListener("click", () => {
    Promise.resolve().then(() => {
      const c = composeScroll();
      download("jieshan-five-views.png", c.toDataURL("image/png"));
    });
  });
  el("btn-skip").addEventListener("click", () => {
    if (state.level >= 5) showScreen("end");
    else goLevel(state.level + 1);
  });
  el("btn-sound").addEventListener("click", () => {
    audio.muted = !audio.muted;
    el("btn-sound").textContent = audio.muted ? "音 关" : "音 开";
    if (!audio.muted) audio.unlock();
  });
  el("btn-ai").addEventListener("click", () => toggleSheet("ai"));
  el("btn-src").addEventListener("click", () => toggleSheet("src"));
  el("sheet-close").addEventListener("click", () => toggleSheet(null));
  el("hint").addEventListener("click", () => {
    const cs = checks().filter((c) => !c.ok);
    if (cs.length) {
      const li = el("hint-text");
      li.textContent = cs[0].label;
      li.hidden = false;
      window.setTimeout(() => (li.hidden = true), 4200);
    }
  });
  window.addEventListener("resize", resize);
}

function toggleSheet(kind: "ai" | "src" | null): void {
  const sheet = el("sheet");
  if (!kind) {
    sheet.hidden = true;
    return;
  }
  sheet.hidden = false;
  el("sheet-title").textContent = kind === "ai" ? AI_NOTE.title : END.sources;
  const body = el("sheet-body");
  body.innerHTML = "";
  if (kind === "ai") {
    for (const p of AI_NOTE.body) {
      const li = document.createElement("li");
      li.textContent = p;
      body.appendChild(li);
    }
    const q = document.createElement("p");
    q.className = "sheet-quote";
    q.textContent = `引用原文：${QUOTES.map((x) => `「${x.text}」—${x.who}`).join("；")}`;
    body.appendChild(q);
  } else {
    for (const s of SOURCES) {
      const li = document.createElement("li");
      li.innerHTML = `<b>${s.title}</b> —— ${s.detail} <a href="${s.url}" target="_blank" rel="noreferrer noopener">原文</a>`;
      body.appendChild(li);
    }
  }
}

export async function boot(): Promise<void> {
  await Promise.race([
    document.fonts.load('400 16px "Jieshan Serif"').catch(() => undefined),
    new Promise((r) => window.setTimeout(r, 2500)),
  ]);
  assets = await P.loadAssets();
  buildLayers();
  resize();
  wire();
  el("cover-title").textContent = COVER.title;
  el("cover-latin").textContent = COVER.latin;
  el("cover-sub").textContent = COVER.sub;
  el("cover-lead").textContent = COVER.lead;
  el("btn-start").textContent = COVER.start;
  el("cover-howto").textContent = COVER.howto;
  el("end-title").textContent = END.title;
  el("end-line").textContent = END.line;
  el("btn-again").textContent = END.again;
  el("btn-save").textContent = END.save;
  showScreen("cover");
  requestAnimationFrame(loop);

  (window as unknown as Record<string, unknown>).__jieshan = {
    info: () => ({ screen: state.screen, level: state.level, checks: checks(), ok: allOk() }),
    set: (patch: Record<string, number>) => {
      const key = `s${state.level}` as "s1" | "s2" | "s3" | "s4" | "s5";
      Object.assign(state[key], patch);
      syncHud();
    },
    goto: (n: number) => goLevel(n),
    seal: () => sealNow(),
    state,
    handles,
    STAGE,
  };
}
