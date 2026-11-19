// 实拍：封面 + 五关（每关给一个已解好的构图）+ 卷末。用法 node scripts/shots.mjs [url]
import { chromium } from "playwright-core";
import fs from "node:fs";

const URL = process.argv[2] || "http://127.0.0.1:4174/";
const EXE = process.env.CHROME_PATH || "C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const OUT = "proof/shots";
fs.mkdirSync(OUT, { recursive: true });

const SOL = {
  1: { wallTop: 470, treeX: 962 },
  2: { pillarL: 470, pillarR: 1210, eaveY: 104, mistY: 400 },
  3: { fx: 380, fy: 128, fw: 1020, fh: 680 },
  4: { wallX: 380, wallTopY: 392 },
  5: { memX: 990, memY: 150, towerX: 1252 },
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 940 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForFunction(() => Boolean(window.__jieshan));
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/00-cover.png` });

// 山脊线校验图
await p.goto(URL + "?ridge=1", { waitUntil: "networkidle" });
await p.waitForFunction(() => Boolean(window.__jieshan));
await p.click("#btn-start");
await p.evaluate(() => window.__jieshan.goto(1));
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/_ridge.png` });
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForFunction(() => Boolean(window.__jieshan));

await p.click("#btn-start");
await p.waitForTimeout(700);
for (let i = 1; i <= 5; i++) {
  if (i > 1) {
    await p.evaluate((n) => window.__jieshan.goto(n), i);
    await p.waitForTimeout(400);
  }
  await p.evaluate((s) => window.__jieshan.set(s), SOL[i]);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/0${i}-level${i}.png` });
  console.log("shot", i, JSON.stringify(await p.evaluate(() => window.__jieshan.info().checks)));
}
await browser.close();
