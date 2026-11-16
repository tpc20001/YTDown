"""把空架子改成新程式。
用法（都可以只給一部分）：
  python tools/rename.py --id MyTool --name "MyTool" --title "我的新工具" --prefix MT --pkg com.tpc.mytool --port 8671 --accent "#1e88e5"
  python tools/rename.py --github 帳號/repo
注意：
  --pkg（套件名稱）裝到手機後就不要再改：改了會變成另一個 App，舊的資料不會跟過去。
  --port 是 📡 遠端網頁的埠，不能跟其他程式撞（USED 列了已知在用的，有新的就加進去）。
"""
import argparse, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import ROOT, brand, save_brand, read, write

USED = {443: '別的服務（HTTPS）', 8561: 'AppKit（電腦）', 9561: 'AppKit Tailscale', 8571: 'AndroidKit 預設'}

ap = argparse.ArgumentParser()
for k in ('id', 'name', 'title', 'prefix', 'pkg', 'accent', 'github'):
    ap.add_argument('--' + k)
ap.add_argument('--port', type=int)
a = ap.parse_args()
b = brand()
if a.id:
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{1,30}', a.id): sys.exit('--id 只能英文、數字、底線，英文開頭')
    b['id'] = a.id
if a.name: b['name'] = a.name
if a.title: b['title'] = a.title
if a.prefix:
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]{0,9}', a.prefix): sys.exit('--prefix 只能英文數字，最多 10 個字')
    b['prefix'] = a.prefix
if a.pkg:
    if not re.fullmatch(r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+', a.pkg): sys.exit('--pkg 要像 com.名字.程式（小寫英文）')
    b['pkg'] = a.pkg
if a.port:
    if a.port in USED and not (a.port == 8571 and b.get('id') == 'AndroidKit'): print(f'⚠ 埠 {a.port} 已經有人用：{USED[a.port]}')
    b['web_port'] = a.port
if a.accent: b['accent'] = a.accent
if a.github is not None: b['github'] = a.github.strip().replace('https://github.com/', '').strip('/')
save_brand(b)
if a.id:
    p = os.path.join(ROOT, 'settings.gradle.kts')
    write(p, re.sub(r'rootProject.name = ".*"', f'rootProject.name = "{a.id}"', read(p)))
print('brand.json：', b)
