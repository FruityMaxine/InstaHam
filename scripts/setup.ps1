# InstaHam · 一键安装脚本 (PowerShell)
# 用法：在项目根目录右键“使用 PowerShell 运行”，或：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1
#   # 强制重下 gallery-dl.exe 到最新版：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1 -Force
#
# 它会：
#   1) 检测 Python / Node / ffmpeg 是否可用
#   2) gallery-dl.exe 不存在或带 -Force 时下载最新版到 bin/（仓库默认已自带）
#   3) 安装 Python 依赖 (server/requirements.txt)
#   4) 安装并构建前端 (web/)

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Has-Cmd($name) {
    $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "==> 检查必需工具" -ForegroundColor Cyan
if (-not (Has-Cmd 'py'))   { throw "缺少 Python (py launcher)。请先装 Python 3.11+。" }
if (-not (Has-Cmd 'npm'))  { throw "缺少 Node.js / npm。请先装 Node 18+。" }
if (-not (Has-Cmd 'ffmpeg')) {
    Write-Warning "未检测到 ffmpeg；若要下载视频请装 ffmpeg 并把路径填进设置。"
}

$bin = Join-Path $root 'bin'
New-Item -ItemType Directory -Path $bin -Force | Out-Null
$exe = Join-Path $bin 'gallery-dl.exe'

if ((Test-Path $exe) -and (-not $Force)) {
    $ver = (& $exe --version) -join ''
    Write-Host "==> gallery-dl.exe 已存在（$ver），跳过下载。要强制升级请加 -Force。" -ForegroundColor Cyan
} else {
    Write-Host "==> 拉取最新 gallery-dl.exe" -ForegroundColor Cyan
    $apiUrl = 'https://codeberg.org/api/v1/repos/mikf/gallery-dl/releases?limit=1'
    $rel = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
    $asset = $rel[0].assets | Where-Object { $_.name -eq 'gallery-dl.exe' } | Select-Object -First 1
    if (-not $asset) { throw "无法在最新 release 中找到 gallery-dl.exe" }
    Write-Host "    版本: $($rel[0].tag_name) · $([math]::Round($asset.size/1MB,1)) MB"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $exe -UseBasicParsing
    & $exe --version | ForEach-Object { Write-Host "    安装: gallery-dl $_" -ForegroundColor Green }
}

Write-Host "==> 安装 Python 依赖" -ForegroundColor Cyan
Push-Location $root
& py -m pip install --upgrade -q -r server/requirements.txt
Pop-Location

Write-Host "==> 安装并构建前端" -ForegroundColor Cyan
Push-Location (Join-Path $root 'web')
& npm install --silent
& npm run build
Pop-Location

Write-Host ""
Write-Host "完成。双击 launcher.bat 启动 InstaHam。" -ForegroundColor Green
