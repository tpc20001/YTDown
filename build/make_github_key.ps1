# 把 keystore\app.jks 和密碼做成兩段文字，貼到 GitHub：repo → Settings → Secrets and variables → Actions → New repository secret
$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$brand = Get-Content (Join-Path $proj 'app\src\main\assets\www\brand.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$desk = Join-Path ([Environment]::GetFolderPath('Desktop')) $brand.id
$ks = Join-Path $proj 'keystore\app.jks'; $pf = Join-Path $proj 'keystore\pass.txt'
if (-not (Test-Path $ks)) {
    $ks = Join-Path $desk 'keystore_backup\app.jks'; $pf = Join-Path $desk 'keystore_backup\pass.txt'
    if (-not (Test-Path $ks)) { throw 'Signing key not found. Run BUILD_AND_INSTALL.bat once first (it creates keystore\app.jks).' }
}
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ks))
$pass = (Get-Content $pf -Raw).Trim()
$out = Join-Path $desk 'KEYSTORE_FOR_GITHUB.txt'
New-Item -ItemType Directory -Force -Path $desk | Out-Null
$txt = "GitHub: repo -> Settings -> Secrets and variables -> Actions -> New repository secret`r`n`r`n" +
       "(1) Name: KEYSTORE_B64`r`n    Secret (copy the whole next line):`r`n$b64`r`n`r`n" +
       "(2) Name: KEYSTORE_PASS`r`n    Secret:`r`n$pass`r`n`r`nAfter adding both, DELETE this file."
[IO.File]::WriteAllText($out, $txt)
Write-Host ('Saved: ' + $out) -ForegroundColor Green
Write-Host 'Add the two secrets on GitHub, then delete that file.' -ForegroundColor Yellow
Start-Process notepad.exe $out
