"""版本加一＋CHANGELOG 加一筆。
用法：
  python tools/bump.py "改了什麼" "改了什麼"           ← 只改畫面（www）
  python tools/bump.py --shell "改了什麼"              ← 也改了外殼（Kotlin、AndroidManifest、圖示）：外殼版本也加一
版本：0.1.01 → 0.1.02 … 0.1.99 → 0.2.01（不用 00）
"""
import datetime, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import WWW, GRADLE, read, write, ui_ver, shell_ver, next_ver, ver_ok

args = sys.argv[1:]
shell = '--shell' in args
notes = [a for a in args if a != '--shell']
if not notes:
    print('要寫這版改了什麼：python tools/bump.py "改了什麼"'); sys.exit(1)
old = ui_ver()
if not ver_ok(old):
    print(f'version.txt 的版本格式不對：{old}'); sys.exit(1)
new = next_ver(old)
write(os.path.join(WWW, 'version.txt'), new)
if shell:
    s = shell_ver() + 1
    write(GRADLE, re.sub(r'val SHELL = \d+', f'val SHELL = {s}', read(GRADLE)))
    notes = [f'（外殼 S{s}）'] + notes
    print(f'外殼 S{s - 1} → S{s}')
p = os.path.join(WWW, 'CHANGELOG.json')
cl = json.loads(read(p))
cl.insert(0, {'version': new, 'date': datetime.date.today().isoformat(), 'notes': notes})
write(p, json.dumps(cl, ensure_ascii=False, indent=1) + '\n')
print(f'畫面 {old} → {new}')
