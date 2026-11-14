# 把 keystore\ytd.jks 轉成一行文字，複製到剪貼簿，貼到 GitHub：repo → Settings → Secrets and variables → Actions → New repository secret，名稱 KEYSTORE_B64
$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ks = Join-Path $proj 'keystore\ytd.jks'
if (-not (Test-Path $ks)) {
    $bk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'YTDown\keystore_backup\ytd.jks'
    if (Test-Path $bk) { $ks = $bk } else { throw 'Signing key not found. Run BUILD_APK.bat once first (it creates keystore\ytd.jks).' }
}
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ks))
Set-Clipboard -Value $b64
$out = Join-Path ([Environment]::GetFolderPath('Desktop')) 'YTDown\KEYSTORE_B64.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
[IO.File]::WriteAllText($out, $b64)
Write-Host ('Key: ' + $ks) -ForegroundColor Green
Write-Host 'Copied to clipboard (also saved to Desktop\YTDown\KEYSTORE_B64.txt).' -ForegroundColor Green
Write-Host 'GitHub: repo -> Settings -> Secrets and variables -> Actions -> New repository secret' -ForegroundColor Yellow
Write-Host '        Name: KEYSTORE_B64     Secret: paste (Ctrl+V)     -> Add secret' -ForegroundColor Yellow
Write-Host 'After that, delete KEYSTORE_B64.txt from the Desktop.' -ForegroundColor Yellow
