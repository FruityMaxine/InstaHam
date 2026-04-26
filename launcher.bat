@echo off
chcp 65001
setlocal

set PORT=8765
set URL=http://127.0.0.1:%PORT%
set ROOT=%~dp0
set TMP=%TEMP%\instaham_launcher.tmp

REM ---- 已在跑 -> 直接打开浏览器 ----
call :CHECK_PORT
if not errorlevel 1 (
    echo [InstaHam] 服务已在 %PORT% 端口运行，打开浏览器 ...
    start "" "%URL%"
    if exist "%TMP%" del "%TMP%"
    exit /b 0
)

echo [InstaHam] 启动 InstaHam 服务 ...
pushd "%ROOT%"

REM 后台启动 uvicorn；输出写到 server.log（隐藏窗口）
start "InstaHam-Server" /b cmd /c "py -m uvicorn server.main:app --host 127.0.0.1 --port %PORT% 1> server.log 2>&1"

echo [InstaHam] 等待服务就绪 ...
set /a TRIES=0

:WAIT
set /a TRIES+=1
timeout /t 1 /nobreak > "%TMP%"
call :CHECK_PORT
if not errorlevel 1 goto OPEN
if %TRIES% lss 30 goto WAIT

echo [InstaHam] 启动超时（30 秒），请检查 server.log
echo [InstaHam] 也可以手动打开 %URL%
if exist "%TMP%" del "%TMP%"
popd
exit /b 1

:OPEN
echo [InstaHam] 服务就绪，打开浏览器: %URL%
start "" "%URL%"
if exist "%TMP%" del "%TMP%"
popd
exit /b 0

REM ---- 子例程：检测端口是否在 LISTENING；errorlevel=0 表示在跑 ----
:CHECK_PORT
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" > "%TMP%"
exit /b %errorlevel%
