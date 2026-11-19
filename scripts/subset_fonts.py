# 把界面用到的字收成一个 woff2（Noto Serif SC，OFL），随包带走，不依赖系统字体。
import pathlib, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(r"C:/Windows/Fonts/NotoSerifSC-VF.ttf")
OUT = root / "assets" / "jieshan-serif.woff2"

chars = set()
for p in list((root / "src").rglob("*.ts")) + list((root / "src").rglob("*.css")) + [root / "index.html"]:
    chars |= set(p.read_text(encoding="utf-8"))

# 基础 ASCII + 中文标点 + 常用符号，避免遗漏
for r in [(0x20, 0x7E), (0x2010, 0x2027), (0x3000, 0x303F), (0xFF00, 0xFF65), (0x00B7, 0x00B7)]:
    chars |= {chr(c) for c in range(r[0], r[1] + 1)}

text = "".join(sorted(c for c in chars if not c.isspace() or c == " "))
(root / "assets" / "glyphs.txt").write_text(text, encoding="utf-8")

if not SRC.exists():
    print(f"[fonts] 找不到 {SRC}", file=sys.stderr)
    sys.exit(1)

cmd = [
    sys.executable, "-m", "fontTools.subset", str(SRC),
    f"--text-file={root / 'assets' / 'glyphs.txt'}",
    "--flavor=woff2",
    f"--output-file={OUT}",
    "--layout-features=*",
    "--no-hinting",
    "--desubroutinize",
]
subprocess.run(cmd, check=True)
print(f"[fonts] {len(text)} chars -> {OUT.name} {OUT.stat().st_size / 1024:.1f} KB")
