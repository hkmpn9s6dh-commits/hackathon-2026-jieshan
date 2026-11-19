#!/usr/bin/env bash
# 全新 clone 只照 README 跑：安装 → 构建 → 交付物断言 → 浏览器断言
set -euo pipefail
cd "$(dirname "$0")"
echo "== 1/4 安装 =="
npm ci
echo "== 2/4 构建 =="
npm run build
echo "== 3/4 交付物断言 =="
node scripts/verify.mjs
echo "== 4/4 浏览器断言 =="
node scripts/e2e.mjs
echo "EXIT=0 全绿"
