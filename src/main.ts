import { boot } from "./core/game.ts";

boot().catch((err) => {
  console.error(err);
  const p = document.createElement("pre");
  p.style.cssText = "position:fixed;left:16px;top:16px;font:12px monospace;color:#a4382a;white-space:pre-wrap";
  p.textContent = `启动失败：${String(err)}`;
  document.body.appendChild(p);
});
