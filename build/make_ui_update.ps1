# Pack app\src\main\assets\www into YTD_UI_V<version>.zip (+ update.json) on Desktop\YTDown. Bump version.txt first.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$proj = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$www = Join-Path $proj 'app\src\main\assets\www'
$ver = (Get-Content (Join-Path $www 'version.txt') -Raw).Trim()
if (-not (Test-Path (Join-Path $www 'index.html'))) { throw 'www\index.html missing' }
$outDir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'YTDown'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$zipPath = Join-Path $outDir ($ver + '.zip')
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
# forward slashes inside the zip (Compress-Archive on Windows PowerShell writes backslashes, which the app would not read)
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    Get-ChildItem $www -Recurse -File | ForEach-Object {
        $rel = 'www/' + $_.FullName.Substring($www.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
    }
} finally { $zip.Dispose() }
$json = '{"ver":"' + $ver + '","zip":"' + $ver + '.zip"}'
[IO.File]::WriteAllText((Join-Path $outDir 'update.json'), $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host ('Made: ' + $zipPath) -ForegroundColor Green
Write-Host ('Made: ' + (Join-Path $outDir 'update.json')) -ForegroundColor Green
Write-Host 'Phone: Settings -> pick update package -> choose this zip. Or serve the YTDown folder and use the update.json URL.' -ForegroundColor Green
Start-Process explorer.exe $outDir
