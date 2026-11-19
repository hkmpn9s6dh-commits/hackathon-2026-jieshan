// 真浏览器里跑一遍：拖动、键盘、触屏、落印、存图、手机视口。
// 用法：node scripts/e2e.mjs [url]   —— 不给 url 时自己起 preview。
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";

const EXE =
  process.env.CHROME_PATH ||
  "C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const PORT = 4192;

let pass = 0;
const fails = [];
function ok(cond, id, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${id}${detail ? " — " + detail : ""}`);
  } else {
    fails.push(id);
    console.log(`  ✗ ${id}${detail ? " — " + detail : ""}`);
  }
}

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    setTimeout(() => {
      s.destroy();
      resolve(false);
    }, 600);
  });
}

let server = null;
async function ensureServer(url) {
  if (url) return url;
  if (await portOpen(PORT)) return `http://127.0.0.1:${PORT}/`;
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  server = spawn(npx, ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await portOpen(PORT)) return `http://127.0.0.1:${PORT}/`;
  }
  throw new Error("preview 起不来");
}

const url = await ensureServer(process.argv[2]);
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const errors = [];

async function newPage(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...opts,
  });
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() => Boolean(window.__jieshan), null, { timeout: 15000 });
  return { ctx, p };
}

// 画布坐标 → 页面坐标
async function box(p) {
  const b = await p.locator("#stage").boundingBox();
  return b;
}
function toPage(b, x, y) {
  return { x: b.x + (x / 1600) * b.width, y: b.y + (y / 900) * b.height };
}

console.log("一、开屏");
const { ctx, p } = await newPage();
ok((await p.title()).includes("借山"), "标题", await p.title());
ok(await p.locator("#cover-title").isVisible(), "封面可见");
ok((await p.locator("#cover-title").textContent()).trim() === "借山", "封面标题是「借山」");
ok(await p.locator("#btn-start").isVisible(), "有「入园」按钮");
const fontOk = await p.evaluate(async () => {
  await document.fonts.ready;
  return document.fonts.check('16px "Jieshan Serif"');
});
ok(fontOk, "随包字体已加载");

console.log("二、第一关：真拖");
await p.click("#btn-start");
await p.waitForTimeout(400);
let info = await p.evaluate(() => window.__jieshan.info());
ok(info.screen === "play" && info.level === 1, "进入第一关");
ok(!info.ok, "初始未解");
ok(await p.locator("#seal").isHidden(), "未解时没有落印按钮");

let b = await box(p);
// 墙：向下拖 120（墙变矮 → 山露出来）
let start = toPage(b, 800, 470 - 20);
await p.mouse.move(start.x, start.y);
await p.mouse.down();
for (let i = 1; i <= 6; i++) await p.mouse.move(start.x, start.y + (120 / 6) * i);
await p.mouse.up();
await p.waitForTimeout(150);
info = await p.evaluate(() => window.__jieshan.info());
const ridge = info.checks.find((c) => c.id === "l1-ridge");
ok(ridge.ok, "拖墙之后山脊过线", ridge.value);

// 树：横向拖到缺口
const treeNow = await p.evaluate(() => window.__jieshan.state.s1.treeX);
const dx = 962 - treeNow;
start = toPage(b, treeNow, 300);
await p.mouse.move(start.x, start.y);
await p.mouse.down();
for (let i = 1; i <= 6; i++) await p.mouse.move(start.x + (dx / 6) * i, start.y);
await p.mouse.up();
await p.waitForTimeout(150);
info = await p.evaluate(() => window.__jieshan.info());
ok(info.checks.find((c) => c.id === "l1-dip").ok, "拖树之后挡在缺口", info.checks.find((c) => c.id === "l1-dip").value);

// 墙高要够：把墙拉回到合法范围
await p.evaluate(() => window.__jieshan.set({ wallTop: 470 }));
await p.waitForTimeout(120);
info = await p.evaluate(() => window.__jieshan.info());
ok(info.ok, "第一关可解");
ok(await p.locator("#seal").isVisible(), "解后出现落印按钮");

console.log("三、键盘");
await p.locator("#stage").focus();
const before = await p.evaluate(() => window.__jieshan.state.s1.wallTop);
await p.keyboard.press("ArrowUp");
await p.waitForTimeout(80);
const after = await p.evaluate(() => window.__jieshan.state.s1.wallTop);
ok(after < before, "方向键能微调", `${before} → ${after}`);
await p.keyboard.press("ArrowDown");
await p.keyboard.press("]");
await p.waitForTimeout(80);

console.log("四、落印与推进");
await p.click("#seal");
await p.waitForTimeout(300);
ok(await p.evaluate(() => window.__jieshan.state.solved[0]), "第一关记下已完成");
await p.waitForTimeout(2300);
info = await p.evaluate(() => window.__jieshan.info());
ok(info.level === 2, "自动进入第二关");

console.log("五、后四关");
const SOL = {
  2: { pillarL: 470, pillarR: 1210, eaveY: 104, mistY: 400 },
  3: { fx: 380, fy: 128, fw: 1020, fh: 680 },
  4: { wallX: 380, wallTopY: 392 },
  5: { memX: 990, memY: 150, towerX: 1252 },
};
for (const n of [2, 3, 4, 5]) {
  await p.evaluate((x) => window.__jieshan.set(x), SOL[n]);
  await p.waitForTimeout(120);
  const i2 = await p.evaluate(() => window.__jieshan.info());
  ok(i2.level === n, `第 ${n} 关在场`);
  ok(i2.ok, `第 ${n} 关判据全过`, i2.checks.filter((c) => !c.ok).map((c) => c.id).join(",") || "");
  await p.click("#seal");
  await p.waitForTimeout(2400);
}

console.log("六、卷末");
ok(await p.evaluate(() => window.__jieshan.info().screen === "end"), "走到卷末");
const figs = await p.locator("#strip img").count();
ok(figs === 5, "五张取景都在", String(figs));
const loaded = await p.evaluate(() =>
  Array.from(document.querySelectorAll("#strip img")).every((i) => i.complete && i.naturalWidth > 0),
);
ok(loaded, "五张图都解码成功");
const srcCount = await p.locator("#srclist li").count();
ok(srcCount >= 5, "出处列表", String(srcCount));

const [dl] = await Promise.all([
  p.waitForEvent("download", { timeout: 8000 }).catch(() => null),
  p.click("#btn-save"),
]);
ok(Boolean(dl), "「存下这张图」能下载", dl ? dl.suggestedFilename() : "no download");

console.log("七、说明面板");
await p.click("#btn-again");
await p.waitForTimeout(300);
await p.click("#btn-ai");
ok(await p.locator("#sheet").isVisible(), "AI 说明能打开");
const aiText = await p.locator("#sheet-body").textContent();
ok(aiText.includes("程序化绘制"), "写明了画面来源");
ok(aiText.includes("OFL"), "写明了字体许可");
await p.click("#sheet-close");
ok(await p.locator("#sheet").isHidden(), "能关掉");

console.log("八、触屏");
const { ctx: tctx, p: tp } = await newPage({ viewport: { width: 900, height: 620 }, hasTouch: true, isMobile: false });
await tp.click("#btn-start");
await tp.waitForTimeout(400);
const tb = await box(tp);
const t0 = toPage(tb, 800, 460);
await tp.evaluate(
  ({ x, y }) => {
    const c = document.getElementById("stage");
    const ev = (type, cx, cy) =>
      c.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 99,
          pointerType: "touch",
          isPrimary: true,
          bubbles: true,
          clientX: cx,
          clientY: cy,
        }),
      );
    ev("pointerdown", x, y);
    for (let i = 1; i <= 5; i++) ev("pointermove", x, y + i * 22);
    ev("pointerup", x, y + 110);
  },
  t0,
);
await tp.waitForTimeout(150);
const tInfo = await tp.evaluate(() => window.__jieshan.info());
ok(tInfo.checks.find((c) => c.id === "l1-ridge").ok, "触屏拖动同样生效", tInfo.checks.find((c) => c.id === "l1-ridge").value);
await tctx.close();

console.log("九、手机视口");
const { ctx: mctx, p: mp } = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
ok(await mp.locator("#btn-start").isVisible(), "手机上封面可点");
await mp.click("#btn-start");
await mp.waitForTimeout(500);
const mb = await box(mp);
ok(mb.width <= 390 && mb.width > 200, "画布装得下", `${Math.round(mb.width)}×${Math.round(mb.height)}`);
ok(await mp.locator("#task").isVisible(), "手机上任务句可见");
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(overflow <= 1, "手机上没有横向溢出", String(overflow));
await mctx.close();

console.log("十、控制台");
ok(errors.length === 0, "没有 console 错误", errors.slice(0, 2).join(" | "));

await ctx.close();
await browser.close();
if (server) server.kill();

console.log(`\n${fails.length === 0 ? "全部通过" : "有失败"}：${pass} 条通过，${fails.length} 条失败`);
if (fails.length) process.exit(1);
