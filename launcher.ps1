# InstaHam launcher (PowerShell)
$ErrorActionPreference = 'SilentlyContinue'
$port = 8765
$url  = "http://127.0.0.1:$port"
$root = $PSScriptRoot

function Test-Port($p) {
    [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

if (Test-Port $port) {
    Write-Host "[InstaHam] 服务已在 $port 端口运行，打开浏览器..."
    Start-Process $url
    exit 0
}

Write-Host "[InstaHam] 启动 InstaHam 服务 ..."
Push-Location $root

# 用 cmd /c 包一层，让 cmd 处理 shell 重定向；隐藏窗口
$cmdLine = "py -m uvicorn server.main:app --host 127.0.0.1 --port $port 1> server.log 2>&1"
Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/c", $cmdLine) `
    -WindowStyle Hidden `
    -WorkingDirectory $root | Out-Null

Write-Host "[InstaHam] 等待服务就绪 ..."
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Port $port) {
        Write-Host "[InstaHam] 服务就绪，打开浏览器: $url"
        Start-Process $url
        Pop-Location
        exit 0
    }
}
Write-Host "[InstaHam] 启动超时（30 秒）。请检查 server.log"
Pop-Location
exit 1
