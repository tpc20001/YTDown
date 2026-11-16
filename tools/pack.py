"""打包畫面更新包：out/<前綴>_V<版本>.zip（manifest.json＋www/…）。
用法：python tools/pack.py
"""
import json, os, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import WWW, OUT, brand, ui_ver, www_files


def pack(out_dir=OUT):
    b, v = brand(), ui_ver()
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{b['prefix']}_V{v}.zip")
    man = {'app': b['id'], 'version': v, 'requires_shell': int(b.get('requires_shell', 1))}
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps(man, ensure_ascii=False, indent=1))
        for rel in www_files():
            z.write(os.path.join(WWW, rel), 'www/' + rel)
    return path


if __name__ == '__main__':
    p = pack()
    print(f'✔ 更新包：{p}（{os.path.getsize(p) // 1024} KB）')
