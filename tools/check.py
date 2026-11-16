"""改完一定要跑：python tools/check.py
檢查：
  1. brand.json、版本、CHANGELOG
  2. 畫面的 JS 語法（要有 node）
  3. 畫面叫的原生功能（KIT.xxx）在外殼 Bridge.kt 都有
  4. Kotlin 括號、AndroidManifest
  5. build.yml 跟 www/gh_workflow.txt 一樣
  6. 沒有把密碼、金鑰放進來（repo 是公開的）
  7. 打一次更新包，檢查內容
  8. 畫面實際跑一次（電腦有 Chrome＋playwright 才跑）：每一頁、背景工作、暫停、遠端 API、重新載入接回工作
--ci：雲端打包時用，跳過第 8 項
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import ROOT, WWW, GRADLE, BRIDGE, YML, OK_EXT, read, brand, ui_ver, shell_ver, ver_ok

CI = '--ci' in sys.argv
fails, warns = [], []


def ok(m): print('  ✔', m)
def bad(m): print('  ✖', m); fails.append(m)
def warn(m): print('  ⚠', m); warns.append(m)


print('1. brand.json、版本、CHANGELOG')
b = brand()
for k in ('id', 'name', 'title', 'prefix', 'pkg', 'web_port', 'accent'):
    if k not in b: bad(f'brand.json 少 {k}')
if not re.fullmatch(r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+', b.get('pkg', '')): bad('pkg 格式不對（要像 com.名字.程式）')
v = ui_ver()
if ver_ok(v): ok(f'畫面版本 {v}')
else: bad(f'version.txt 格式不對：{v}（要像 0.1.02）')
cl = json.loads(read(os.path.join(WWW, 'CHANGELOG.json')))
if cl and cl[0].get('version') == v: ok('CHANGELOG 最上面＝目前版本')
else: bad('CHANGELOG 最上面不是目前版本（用 tools/bump.py 加版本）')
s = shell_ver()
if s < 1: bad('build.gradle.kts 找不到 val SHELL')
elif int(b.get('requires_shell', 1)) > s: bad(f'brand.json requires_shell={b.get("requires_shell")} 比外殼 S{s} 還新')
else: ok(f'外殼 S{s}，畫面要求外殼 ≥ S{b.get("requires_shell", 1)}')

print('2. JS 語法')
node = shutil.which('node')
js_files = ['kit.js', 'app.js'] + [f for f in os.listdir(WWW) if f.endswith('.js') and f not in ('kit.js', 'app.js')]
if not node: warn('沒有 node，跳過 JS 語法檢查')
else:
    tmp = tempfile.mkdtemp()
    srcs = [(f, read(os.path.join(WWW, f))) for f in js_files]
    for h in [f for f in os.listdir(WWW) if f.endswith('.html')]:
        for i, m in enumerate(re.findall(r'<script>([\s\S]*?)</script>', read(os.path.join(WWW, h)))):
            srcs.append((f'{h}#script{i + 1}', m))
    for name, src in srcs:
        p = os.path.join(tmp, re.sub(r'[^\w.]', '_', name) + '.js')
        open(p, 'w', encoding='utf-8').write(src)
        r = subprocess.run([node, '--check', p], capture_output=True, text=True, encoding='utf-8')
        if r.returncode: bad(f'{name} 語法錯誤：\n' + (r.stderr or '')[-800:])
        else: ok(name)
    shutil.rmtree(tmp, ignore_errors=True)

print('3. 畫面叫的原生功能都存在')
bridge = read(BRIDGE)
native = set(re.findall(r'@JavascriptInterface\s+fun\s+(\w+)', bridge))
used = set()
for f in js_files:
    used |= set(re.findall(r"\b(?:call|jcall|has)\('(\w+)'", read(os.path.join(WWW, f))))
missing = sorted(used - native)
if missing: bad('Bridge.kt 沒有這些功能（要加到外殼，外殼版本也要加一）：' + ', '.join(missing))
else: ok(f'畫面用到 {len(used)} 個，外殼都有（外殼共 {len(native)} 個）')

def kt_code(src):
    """拿掉 Kotlin 的註解、字串（字串裡的 ${…} 也算字串），只留程式碼來數括號"""
    out, i, n, stack = [], 0, len(src), []
    while i < n:
        c = src[i]
        if not stack:
            if src.startswith('//', i): j = src.find('\n', i); i = n if j < 0 else j; continue
            if src.startswith('/*', i): j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
            if c == "'" and i + 2 < n:
                j = i + 1
                while j < n and src[j] != "'": j += 2 if src[j] == '\\' else 1
                i = j + 1; continue
            if c == '"': stack.append('"'); i += 1; continue
            out.append(c); i += 1; continue
        top = stack[-1]
        if top == '"':
            if c == '\\': i += 2; continue
            if c == '"': stack.pop(); i += 1; continue
            if src.startswith('${', i): stack.append('{'); i += 2; continue
            i += 1; continue
        # 在 ${ … } 裡面
        if c == '"': stack.append('"'); i += 1; continue
        if c == '{': stack.append('{'); i += 1; continue
        if c == '}': stack.pop(); i += 1; continue
        i += 1
    return ''.join(out)


print('4. Kotlin、AndroidManifest')
kdir = os.path.dirname(BRIDGE)
for f in sorted(os.listdir(kdir)):
    code = kt_code(read(os.path.join(kdir, f)))
    if code.count('{') != code.count('}') or code.count('(') != code.count(')'):
        bad(f'{f}：括號數量對不起來 {{}}={code.count("{")}/{code.count("}")} ()={code.count("(")}/{code.count(")")}')
    else: ok(f)
man = read(os.path.join(ROOT, 'app', 'src', 'main', 'AndroidManifest.xml'))
for need in ('.MainActivity', '.KeepAlive', 'FileProvider', 'android:name=".App"'):
    if need not in man: bad('AndroidManifest 少 ' + need)
if 'Host.kt' in os.listdir(kdir):
    m = re.search(r'OK_EXT = setOf\(([^)]*)\)', read(os.path.join(kdir, 'Host.kt')))
    if m and set(re.findall(r'"(\w+)"', m.group(1))) != OK_EXT: bad('Host.kt 的 OK_EXT 跟 tools/_kit.py 不一樣')

print('5. build.yml')
gw = os.path.join(WWW, 'gh_workflow.txt')
if not os.path.exists(YML): bad('少 .github/workflows/build.yml')
elif read(YML) != read(gw): bad('build.yml 跟 www/gh_workflow.txt 不一樣（改了 build.yml 要複製一份過去）')
else: ok('build.yml ＝ gh_workflow.txt')

print('6. 沒有密碼、金鑰')
pat = re.compile(r'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|api_hash\s*[=:]\s*["\']?[0-9a-f]{32}|sessionid\s*[=:]\s*["\']?[0-9A-Za-z%]{20,}')
skip_dirs = {'.git', 'build', '.gradle', 'out', 'keystore', '__pycache__', 'node_modules'}
hits = []
for d, ds, fs in os.walk(ROOT):
    ds[:] = [x for x in ds if x not in skip_dirs]
    for f in fs:
        p = os.path.join(d, f); rel = os.path.relpath(p, ROOT)
        if f.endswith(('.jks', '.keystore', '.p12')) or f.startswith('KEYSTORE_'): hits.append(rel + '（鑰匙檔）'); continue
        if os.path.getsize(p) > 2_000_000: continue
        try: t = open(p, encoding='utf-8', errors='ignore').read()
        except Exception: continue
        if pat.search(t): hits.append(rel)
if hits: bad('可能有私人資料：' + ', '.join(hits))
else: ok('沒找到')
gi = read(os.path.join(ROOT, '.gitignore')) if os.path.exists(os.path.join(ROOT, '.gitignore')) else ''
if 'keystore/' not in gi: bad('.gitignore 要有 keystore/')

print('7. 更新包')
from pack import pack
tmp = tempfile.mkdtemp()
try:
    z = pack(tmp)
    with zipfile.ZipFile(z) as zf:
        names = zf.namelist(); man = json.loads(zf.read('manifest.json'))
        if man.get('app') != b['id'] or man.get('version') != v: bad('manifest.json 內容不對')
        elif 'www/index.html' not in names or 'www/version.txt' not in names: bad('更新包少 index.html 或 version.txt')
        else: ok(f'{os.path.basename(z)}：{len(names)} 個檔，{os.path.getsize(z) // 1024} KB')
finally:
    shutil.rmtree(tmp, ignore_errors=True)

print('8. 畫面實際跑一次')
if CI: print('  （雲端打包時跳過）')
else:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        sync_playwright = None
    chrome = next((c for c in ('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
                              r'C:\Program Files\Google\Chrome\Application\chrome.exe') if os.path.exists(c)), None)
    if not sync_playwright: warn('沒有 playwright，跳過（pip install playwright）')
    else:
        mock = read(os.path.join(ROOT, 'tools', 'mock_kit.js'))
        try:
            with sync_playwright() as pw:
                br = pw.chromium.launch(**({'executable_path': chrome} if chrome else {}))
                ctx = br.new_context(viewport={'width': 400, 'height': 820}, is_mobile=True, has_touch=True)
                files = {n: read(os.path.join(WWW, n)) for n in ('brand.json', 'CHANGELOG.json', 'version.txt', 'gh_workflow.txt')}
                ctx.add_init_script(f'window.__mockVer={json.dumps(v)};window.__mockFiles={json.dumps(files)};' + mock)
                pg = ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
                url = 'file://' + os.path.join(WWW, 'index.html').replace('\\', '/')
                if not url.startswith('file:///'): url = url.replace('file://', 'file:///')
                pg.goto(url); pg.wait_for_function('window.__mock && window.__mock.ready', timeout=8000)
                ok(f'開好了，回報 ready（{pg.evaluate("window.__mock.ready")}）')
                for pid in pg.evaluate('Object.keys(kit.PAGES)'):
                    pg.evaluate(f'kit.go({json.dumps(pid)})'); pg.wait_for_timeout(120)
                    if pg.evaluate("!!document.querySelector('#page .card.bad')"): bad(f'頁面 {pid} 畫出錯誤')
                ok('每一頁都畫得出來：' + ', '.join(pg.evaluate('Object.keys(kit.PAGES)')))
                kinds = pg.evaluate('Object.keys(kit.KINDS)')
                if kinds:
                    k = kinds[0]
                    pg.evaluate(f'kit.cfg.data.demo_secs=2; for(let i=0;i<3;i++) kit.jobs.add({json.dumps(k)}, "測試"+i, {{}})')
                    pg.wait_for_timeout(1500)
                    run = pg.evaluate(f'kit.jobs.running({json.dumps(k)}).length')
                    if run < 1: bad('背景工作沒有開始跑')
                    pg.evaluate(f'kit.jobs.pause({json.dumps(k)}, true)'); pg.wait_for_timeout(1200)
                    pct1 = pg.evaluate('kit.J.list.map(j=>j.pct).join()'); pg.wait_for_timeout(1200)
                    if pg.evaluate('kit.J.list.map(j=>j.pct).join()') != pct1 and 'step' in read(os.path.join(WWW, 'app.js')): bad('暫停之後還在跑')
                    else: ok('背景工作會跑、暫停會停')
                    pg.evaluate('kit.jobs.checkpoint()'); pg.reload(); pg.wait_for_function('window.__mock && window.__mock.ready', timeout=8000)
                    n = pg.evaluate(f'kit.J.list.filter(j=>j.kind=={json.dumps(k)} && /run|queue/.test(j.status)).length')
                    if n >= 1: ok(f'重新載入（像熱更新）之後接回 {n} 個工作')
                    else: bad('重新載入後工作不見了')
                    pg.evaluate(f'kit.jobs.pause({json.dumps(k)}, false)')
                pg.evaluate('__kitRemote(JSON.stringify({id:"t1",path:"state",body:""}))'); pg.wait_for_timeout(300)
                r = pg.evaluate('window.__mock.remote.t1')
                if r and r.get('ok'): ok('遠端 API 有回應')
                else: bad('遠端 API 沒回應')
                pg.evaluate('kit.cfg.set("zoom", 130); kit.fit()')
                pg.set_viewport_size({'width': 260, 'height': 460}); pg.wait_for_timeout(200)
                z = pg.evaluate('kit.ZM')
                ok(f'小窗時自動縮小（{z}）') if z < 1.3 else bad('小窗時沒有縮小')
                pg.evaluate('kit.cfg.set("zoom", 100)')
                real = [e for e in errs if 'KIT-ERR' in e or 'Error' in e]
                if real: bad('畫面有錯誤：\n    ' + '\n    '.join(real[:8]))
                else: ok('沒有錯誤')
                br.close()
        except Exception as e:
            bad(f'畫面測試失敗：{e}')

print()
if fails:
    print(f'✖ {len(fails)} 個問題要修'); sys.exit(1)
print('✔ 全部通過' + (f'（{len(warns)} 個提醒）' if warns else ''))
