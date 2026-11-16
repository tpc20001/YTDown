# AndroidKit one-click APK build: JDK 17 -> Android SDK -> Gradle -> signing key -> build APK -> copy to Desktop\<id> -> install to phone over USB (if connected)
# Everything is downloaded once into %LOCALAPPDATA%\AppBuilder\android and reused next time. No Android Studio needed.
param(
    [switch]$NoInstall,
    [switch]$Clean
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Step($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Get-File($url, $out, $what) {
    Write-Host ("Downloading " + $what + " ...") -ForegroundColor Yellow
    for ($i = 1; $i -le 3; $i++) {
        try { Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing; return }
        catch { Write-Host ("  try " + $i + " failed: " + $_.Exception.Message) -ForegroundColor DarkYellow; Start-Sleep 3 }
    }
    throw ("Download failed: " + $what + "  (" + $url + ")")
}

$proj  = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$cache = Join-Path $env:LOCALAPPDATA 'AppBuilder\android'
$brand = Get-Content (Join-Path $proj 'app\src\main\assets\www\brand.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$appId = $brand.id
$outDir = Join-Path ([Environment]::GetFolderPath('Desktop')) $appId
New-Item -ItemType Directory -Force -Path $cache, $outDir | Out-Null
$gk = Get-Content (Join-Path $proj 'app\build.gradle.kts') -Raw -Encoding UTF8
$shell = '0'; if ($gk -match 'val SHELL = (\d+)') { $shell = $Matches[1] }
$uiv = (Get-Content (Join-Path $proj 'app\src\main\assets\www\version.txt') -Raw).Trim()
$ver = $appId + '_V' + $uiv + '_S' + $shell
Write-Host ("Project: " + $proj) -ForegroundColor Green
Write-Host ("Version: " + $ver + "   ->   " + $outDir) -ForegroundColor Green

Step '[1/6] Java 17 (JDK)'
$jdkRoot = Join-Path $cache 'jdk17'
function Find-Jdk { if (Test-Path $jdkRoot) { $j = Get-ChildItem $jdkRoot -Filter 'java.exe' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -eq 'bin' } | Select-Object -First 1; if ($j) { return $j.Directory.Parent.FullName } }; return $null }
$jdk = Find-Jdk
if (-not $jdk) {
    $z = Join-Path $cache 'jdk17.zip'
    Get-File 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse' $z 'Java 17 (about 190 MB)'
    if (Test-Path $jdkRoot) { Remove-Item $jdkRoot -Recurse -Force }
    Expand-Archive $z $jdkRoot -Force; Remove-Item $z -Force
    $jdk = Find-Jdk
    if (-not $jdk) { throw 'Java was downloaded but java.exe was not found.' }
}
$env:JAVA_HOME = $jdk
$env:Path = (Join-Path $jdk 'bin') + ';' + $env:Path
Write-Host ('Using: ' + $jdk) -ForegroundColor Green

Step '[2/6] Android SDK'
$sdk = Join-Path $cache 'sdk'
$sdkm = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkm)) {
    $z = Join-Path $cache 'cmdtools.zip'; $x = Join-Path $cache 'cmdtools_x'
    Get-File 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' $z 'Android command-line tools (about 150 MB)'
    if (Test-Path $x) { Remove-Item $x -Recurse -Force }
    Expand-Archive $z $x -Force
    $dst = Join-Path $sdk 'cmdline-tools\latest'
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    New-Item -ItemType Directory -Force -Path (Join-Path $sdk 'cmdline-tools') | Out-Null
    Move-Item (Join-Path $x 'cmdline-tools') $dst
    Remove-Item $z, $x -Recurse -Force -ErrorAction SilentlyContinue
}
$env:ANDROID_HOME = $sdk; $env:ANDROID_SDK_ROOT = $sdk
$need = @('platforms;android-37', 'build-tools;35.0.0', 'platform-tools')
$missing = @()
if (-not (Test-Path (Join-Path $sdk 'platforms\android-37'))) { $missing += $need[0] }
if (-not (Test-Path (Join-Path $sdk 'build-tools\35.0.0'))) { $missing += $need[1] }
if (-not (Test-Path (Join-Path $sdk 'platform-tools\adb.exe'))) { $missing += $need[2] }
if ($missing.Count -gt 0) {
    Write-Host 'Accepting Android SDK licenses...' -ForegroundColor Yellow
    (('y' + "`r`n") * 40) | & $sdkm --sdk_root="$sdk" --licenses | Out-Null
    Write-Host ('Installing: ' + ($missing -join ', ') + '  (a few minutes)') -ForegroundColor Yellow
    & $sdkm --sdk_root="$sdk" @missing
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK install failed' }
}
Write-Host 'SDK OK' -ForegroundColor Green

Step '[3/6] Gradle 8.13'
$gradle = Join-Path $cache 'gradle-8.13\bin\gradle.bat'
if (-not (Test-Path $gradle)) {
    $z = Join-Path $cache 'gradle.zip'
    Get-File 'https://services.gradle.org/distributions/gradle-8.13-bin.zip' $z 'Gradle 8.13 (about 130 MB)'
    Expand-Archive $z $cache -Force; Remove-Item $z -Force
}
Write-Host 'Gradle OK' -ForegroundColor Green

Step '[4/6] Signing key'
$ks = Join-Path $proj 'keystore\app.jks'
$pf = Join-Path $proj 'keystore\pass.txt'
if (-not (Test-Path $ks)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $ks) | Out-Null
    $chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $pass = -join (1..20 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    [IO.File]::WriteAllText($pf, $pass)
    & (Join-Path $jdk 'bin\keytool.exe') -genkeypair -v -keystore $ks -alias app -keyalg RSA -keysize 2048 -validity 36500 `
        -storepass $pass -keypass $pass -dname ('CN=' + $appId + ', OU=Personal, O=Personal, C=TW') | Out-Null
    if (-not (Test-Path $ks)) { throw 'Could not create the signing key' }
    Write-Host 'New signing key created: keystore\app.jks (+ keystore\pass.txt)' -ForegroundColor Yellow
    Write-Host 'KEEP BOTH FILES. Same key = later APKs install over the old one without uninstalling.' -ForegroundColor Yellow
    $bk = Join-Path $outDir 'keystore_backup'; New-Item -ItemType Directory -Force -Path $bk | Out-Null
    Copy-Item $ks, $pf $bk -Force
} else { Write-Host 'Using existing keystore\app.jks' -ForegroundColor Green }
if (Test-Path $pf) { $env:KEYSTORE_PASS = (Get-Content $pf -Raw).Trim() }

Step '[5/6] Build APK (first time 5-15 min)'
$lp = Join-Path $proj 'local.properties'; if (Test-Path $lp) { Remove-Item $lp -Force }
$tasks = @('assembleRelease'); if ($Clean) { $tasks = @('clean', 'assembleRelease') }
& $gradle -p $proj @tasks --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed - copy the red error lines above and send them to Claude.' }
$apk = Get-ChildItem (Join-Path $proj 'app\build\outputs\apk\release') -Filter '*.apk' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $apk) { throw 'Build said OK but no APK was found.' }
$final = Join-Path $outDir ($ver + '.apk')
Copy-Item $apk.FullName $final -Force
Write-Host ('APK: ' + $final + '  (' + [math]::Round($apk.Length / 1MB, 1) + ' MB)') -ForegroundColor Green

Step '[6/6] Install to phone (USB)'
$adb = Join-Path $sdk 'platform-tools\adb.exe'
$phone = $null
if (-not $NoInstall) {
    $dev = (& $adb devices) | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
    if ($dev) { $phone = ($dev | Select-Object -First 1) -replace '\tdevice$', '' }
}
if ($phone) {
    Write-Host ('Phone found: ' + $phone + ' - installing...') -ForegroundColor Yellow
    & $adb -s $phone install -r $final
    if ($LASTEXITCODE -eq 0) { Write-Host ('Installed on phone. Open "' + $brand.name + '".') -ForegroundColor Green }
    else { Write-Host 'USB install failed. Copy the APK to the phone and tap it instead.' -ForegroundColor Yellow }
} else {
    Write-Host 'No phone on USB (or USB debugging off). Copy the APK to the phone (LINE / cloud / USB) and tap it to install.' -ForegroundColor Yellow
}
Start-Process explorer.exe $outDir
Write-Host ''
Write-Host 'Done. Later versions: Claude gives you a <prefix>_V....zip (or pushes to GitHub). No need to run this again unless the shell changes.' -ForegroundColor Green
