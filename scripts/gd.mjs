import { chromium } from "playwright-core";
import fs from "node:fs";
const URL = process.argv[2] || "http://127.0.0.1:4180/";
const EXE = "C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const VARIANTS = {
  v1: { pillarL: 700, pillarR: 1428, eaveY: 104, mistY: 400 },
  v2: { pillarL: 660, pillarR: 1368, eaveY: 96, mistY: 380 },
  v3: { pillarL: 770, pillarR: 1486, eaveY: 100, mistY: 410 },
};
const OUT = "proof/gate-d";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForFunction(() => Boolean(window.__jieshan));
await p.click("#btn-start");
for (const [k, v] of Object.entries(VARIANTS)) {
  await p.evaluate(() => window.__jieshan.goto(2));
  await p.evaluate((s) => window.__jieshan.set(s), v);
  await p.waitForTimeout(350);
  const info = await p.evaluate(() => window.__jieshan.info());
  await p.screenshot({ path: `${OUT}/${k}.png` });
  console.log(k, info.checks.map((c) => `${c.id}:${c.ok}`).join(" "));
}
await browser.close();
