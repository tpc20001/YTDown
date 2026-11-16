"""雲端打包用（build.yml 會叫，自己不用跑）。
  python tools/make_release.py brand --repo 帳號/repo     ← 把發佈的 repo 寫進 brand.json（裝了的 App 才知道去哪看更新）
  python tools/make_release.py files --apk 路徑.apk       ← 在 out/ 做出：更新包 zip、APK、update.json
"""
import argparse, glob, hashlib, json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import WWW, OUT, brand, save_brand, ui_ver, shell_ver, read
from pack import pack


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()


ap = argparse.ArgumentParser()
ap.add_argument('cmd', choices=['brand', 'files'])
ap.add_argument('--repo', default='')
ap.add_argument('--apk', default='')
a = ap.parse_args()

if a.cmd == 'brand':
    b = brand()
    if a.repo and b.get('github') != a.repo:
        b['github'] = a.repo; save_brand(b); print('brand.json github =', a.repo)
    sys.exit(0)

b, v, s = brand(), ui_ver(), shell_ver()
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
z = pack(OUT)
apks = glob.glob(a.apk) if a.apk else []
if not apks:
    sys.exit('找不到 APK：' + a.apk)
apk = os.path.join(OUT, f"{b['id']}_V{v}_S{s}.apk")
shutil.copy(apks[0], apk)
cl = json.loads(read(os.path.join(WWW, 'CHANGELOG.json')))
tag = f'v{v}-s{s}'
info = {'app': b['id'], 'name': b['name'], 'version': v, 'shell': s, 'tag': tag,
        'zip': os.path.basename(z), 'zip_sha256': sha(z), 'apk': os.path.basename(apk), 'apk_sha256': sha(apk),
        'notes': cl[0].get('notes', []) if cl else []}
with open(os.path.join(OUT, 'update.json'), 'w', encoding='utf-8') as f:
    json.dump(info, f, ensure_ascii=False, indent=1)
print(json.dumps(info, ensure_ascii=False, indent=1))
gh = os.environ.get('GITHUB_OUTPUT')
if gh:
    with open(gh, 'a', encoding='utf-8') as f:
        f.write(f'tag={tag}\nname={b["name"]} {v}（外殼 S{s}）\n')
