@echo off
title Smart React Launcher

set PORT=3001

echo Killing old node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Checking dependencies...

IF NOT EXIST node_modules (
    echo Installing packages...
    call npm install
)

echo.
echo Starting React on port %PORT% ...
start http://localhost:%PORT%

call npm run dev -- --port %PORT%

pause
