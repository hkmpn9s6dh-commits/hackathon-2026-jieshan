// 交付物断言。不碰浏览器：几何、文案、素材、构建产物。
// 用法：node scripts/verify.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import * as G from "../src/core/geo.ts";
import { LEVELS, QUOTES, SOURCES, COVER, END, AI_NOTE } from "../src/core/text.ts";

const quiet = process.argv.includes("--quiet");
let pass = 0;
const fails = [];
function ok(cond, id, detail = "") {
  if (cond) {
    pass++;
    if (!quiet) console.log(`  ✓ ${id}${detail ? " — " + detail : ""}`);
  } else {
    fails.push(`${id}${detail ? " — " + detail : ""}`);
    console.log(`  ✗ ${id}${detail ? " — " + detail : ""}`);
  }
}
function section(t) {
  if (!quiet) console.log(`\n${t}`);
}

// ————————————————— 1. 五关的几何：能解、且判据真的会咬 —————————————————
section("一、几何判据");

/** 每关一个已知能过的解 */
const SOLVED = {
  1: { wallTop: 470, treeX: 962 },
  2: { pillarL: 700, pillarR: 1428, eaveY: 104, mistY: 400 },
  3: { fx: 380, fy: 128, fw: 1020, fh: 680 },
  4: { wallX: 380, wallTopY: 392 },
  5: { memX: G.PAGODA.x, memY: G.PAGODA.y, towerX: 1252 },
};
const MEASURE = { 1: G.measure1, 2: G.measure2, 3: G.measure3, 4: G.measure4, 5: G.measure5 };

for (const n of [1, 2, 3, 4, 5]) {
  const cs = MEASURE[n](SOLVED[n]);
  const bad = cs.filter((c) => !c.ok);
  ok(bad.length === 0, `L${n} 已知解全过`, bad.map((c) => c.id).join(",") || `${cs.length} 条`);
}

/** 每条判据都要有能把它打成 false 的输入，否则等于没判 */
const MUTATIONS = [
  ["1", "l1-ridge", { ...SOLVED[1], wallTop: 250 }],
  ["1", "l1-dip", { ...SOLVED[1], treeX: 600 }],
  ["1", "l1-wall", { ...SOLVED[1], wallTop: 620 }],
  ["2", "l2-gap", { ...SOLVED[2], pillarR: 1100 }],
  ["2", "l2-balance", { ...SOLVED[2], pillarL: 470, pillarR: 1210 }],
  ["2", "l2-eave", { ...SOLVED[2], eaveY: 160 }],
  ["2", "l2-base", { ...SOLVED[2], mistY: 330 }],
  ["3", "l3-aspect", { ...SOLVED[3], fh: 600 }],
  ["3", "l3-pagoda", { ...SOLVED[3], fx: 60 }],
  ["3", "l3-water", { ...SOLVED[3], fy: 250 }],
  ["4", "l4-low", { ...SOLVED[4], wallTopY: 300 }],
  ["4", "l4-clear", { ...SOLVED[4], wallX: 1000 }],
  ["4", "l4-water", { ...SOLVED[4], wallTopY: 440 }],
  ["5", "l5-place", { ...SOLVED[5], memX: 700 }],
  ["5", "l5-visible", { ...SOLVED[5], towerX: 900 }],
  ["5", "l5-cover", { ...SOLVED[5], memX: 1300 }],
];
for (const [lv, id, s] of MUTATIONS) {
  const cs = MEASURE[Number(lv)](s);
  const target = cs.find((c) => c.id === id);
  ok(Boolean(target) && target.ok === false, `${id} 会被打回`, target ? target.value : "missing");
}

/** 边界：卡在阈值上下的两次结果必须不同，防止判据是恒真 */
ok(G.measure1({ wallTop: 300, treeX: 962 }).some((c) => c.id === "l1-ridge" && !c.ok), "L1 山脊阈值有下界（300 过不去）");
ok(G.measure1({ wallTop: 312, treeX: 962 }).find((c) => c.id === "l1-ridge").ok, "L1 山脊阈值之内可过（312 可以）");

// ————————————————— 2. 关卡数据 —————————————————
section("二、关卡数据");
ok(LEVELS.length === 5, "五关", String(LEVELS.length));
ok(LEVELS.every((l, i) => l.id === i + 1), "关卡序号连续");
ok(LEVELS.every((l) => l.task.length >= 10), "每关都有任务句");
ok(LEVELS.every((l) => l.note.length >= 20), "每关都有旁白");
ok(LEVELS.filter((l) => l.id !== 4).every((l) => l.handles.length >= 2), "除减法关外每关至少两个可动对象");
ok(LEVELS.find((l) => l.id === 4).handles.length === 1, "第 4 关只有一个可动对象（减法）");
ok(new Set(LEVELS.map((l) => l.year)).size === 5, "五个年代各不相同");
ok(LEVELS.every((l) => /^(约\s*)?\d{3,4}$/.test(l.year) || l.year.includes("今天")), "年代写法统一");

// ————————————————— 3. 文案与出处 —————————————————
section("三、文案与出处");
const byKey = new Map(QUOTES.map((q) => [q.key, q]));
ok(QUOTES.length >= 5, "引用条目够数", String(QUOTES.length));
for (const l of LEVELS) {
  const q = byKey.get(l.closingKey);
  ok(Boolean(q), `${l.name} 的收束句有出处`, l.closingKey);
  if (q) ok(SOURCES.some((s) => s.key === q.source), `${q.key} 的出处可解析`, q.source);
}
for (const q of QUOTES) {
  ok(q.text.length >= 6, `${q.key} 有原文`);
  ok(Boolean(q.who), `${q.key} 有署名`);
  ok(/^https?:\/\//.test(SOURCES.find((s) => s.key === q.source)?.url ?? ""), `${q.key} 的出处有链接`);
}
ok(SOURCES.every((s) => /^https?:\/\//.test(s.url)), "所有出处都是链接");
ok(SOURCES.every((s) => s.detail.length >= 6), "所有出处都有说明");
ok(COVER.title === "借山", "封面标题");
ok(END.sources.length > 0 && AI_NOTE.body.length >= 3, "AI 说明与出处齐备");

// 禁用词：不写做不到的承诺
const BANNED = ["免费领取", "扫码关注", "点击下载APP", "保证获奖", "必得奖", "国家级认证"];
const allText = JSON.stringify({ LEVELS, QUOTES, SOURCES, COVER, END, AI_NOTE });
for (const w of BANNED) ok(!allText.includes(w), `不含「${w}」`);

// ————————————————— 4. 素材 —————————————————
section("四、素材");
const assets = [
  ["public/assets/far-range.webp", 200 * 1024],
  ["public/assets/pagoda.webp", 300 * 1024],
  ["public/assets/tree.webp", 300 * 1024],
  ["public/assets/wall.webp", 260 * 1024],
  ["assets/jieshan-serif.woff2", 400 * 1024],
];
for (const [p, cap] of assets) {
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  ok(Boolean(st) && st.size > 20000, `${p} 存在且有内容`, st ? `${(st.size / 1024).toFixed(0)} KB` : "missing");
  ok(Boolean(st) && st.size <= cap, `${p} 不超预算`, st ? `${(st.size / 1024).toFixed(0)} KB <= ${(cap / 1024).toFixed(0)} KB` : "-");
}
// 塔的图片比必须接近 0.695，否则画面里会被压扁
const PAGODA_ASPECT = 924 / 1330;
const rectAspect = G.PAGODA.w / G.PAGODA.h;
ok(Math.abs(rectAspect / PAGODA_ASPECT - 1) < 0.03, "塔的框比与图片一致", `${rectAspect.toFixed(3)} vs ${PAGODA_ASPECT.toFixed(3)}`);

// ————————————————— 5. 构建产物 —————————————————
section("五、构建产物");
ok(fs.existsSync("dist/index.html"), "dist/index.html 存在");
if (fs.existsSync("dist")) {
  const files = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else files.push([p, fs.statSync(p).size]);
    }
  };
  walk("dist");
  const total = files.reduce((a, b) => a + b[1], 0);
  ok(total < 2.2 * 1024 * 1024, "整站小于 2.2 MB", `${(total / 1024).toFixed(0)} KB`);
  ok(files.some(([p]) => p.endsWith(".woff2")), "字体随包");
  const html = fs.readFileSync("dist/index.html", "utf8");
  ok(html.includes("<canvas"), "有画布");
  ok(html.includes("借山"), "标题进页面");
  ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<a [^>]*>/g, "")), "页面不引外链资源");
}

// ————————————————— 6. 全流程可通关 —————————————————
section("六、可通关");
for (const n of [1, 2, 3, 4, 5]) {
  ok(MEASURE[n](SOLVED[n]).every((c) => c.ok), `第 ${n} 关可解`);
}

console.log(`\n${fails.length === 0 ? "全部通过" : "有失败"}：${pass} 条通过，${fails.length} 条失败`);
if (fails.length) {
  for (const f of fails) console.log("  ! " + f);
  process.exit(1);
}
