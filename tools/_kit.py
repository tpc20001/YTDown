"""tools 共用：路徑、讀寫 brand.json／版本。"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'app', 'src', 'main', 'assets', 'www')
GRADLE = os.path.join(ROOT, 'app', 'build.gradle.kts')
BRIDGE = os.path.join(ROOT, 'app', 'src', 'main', 'java', 'com', 'androidkit', 'shell', 'Bridge.kt')
YML = os.path.join(ROOT, '.github', 'workflows', 'build.yml')
OUT = os.path.join(ROOT, 'out')

# 更新包只收這些副檔名（外殼 Host.kt 的 OK_EXT 要一樣）
OK_EXT = {'html', 'js', 'css', 'json', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'woff2', 'mp3', 'wav'}

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)


def brand():
    return json.loads(read(os.path.join(WWW, 'brand.json')))


def save_brand(b):
    write(os.path.join(WWW, 'brand.json'), json.dumps(b, ensure_ascii=False, indent=1) + '\n')


def ui_ver():
    return read(os.path.join(WWW, 'version.txt')).strip()


def shell_ver():
    m = re.search(r'val SHELL = (\d+)', read(GRADLE))
    return int(m.group(1)) if m else 0


def ver_ok(v):
    return re.fullmatch(r'\d+\.\d+\.\d{2}', v or '') is not None and not v.endswith('.00')


def next_ver(v):
    a, b, c = (int(x) for x in v.split('.'))
    c += 1
    if c > 99:
        b, c = b + 1, 1
    return f'{a}.{b}.{c:02d}'


def www_files():
    """更新包要放的檔（相對 www 的路徑）"""
    out = []
    for d, _, fs in os.walk(WWW):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), WWW).replace('\\', '/')
            if f.rsplit('.', 1)[-1].lower() in OK_EXT and not f.startswith('.'):
                out.append(rel)
    return sorted(out)
