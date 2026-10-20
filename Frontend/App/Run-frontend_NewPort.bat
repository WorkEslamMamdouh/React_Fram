@echo off
title Smart React Launcher

set PORT=3001

echo =========================
echo Checking dependencies...
echo =========================

IF NOT EXIST node_modules (
    echo Installing packages...
    call npm install
)

echo.
echo Checking port %PORT% ...

:CHECKPORT
netstat -ano | findstr :%PORT% >nul
IF %ERRORLEVEL%==0 (
    set /a PORT+=1
    goto CHECKPORT
)

echo Port available: %PORT%
echo.

echo Starting React on port %PORT% ...
start http://localhost:%PORT%

call npm run dev -- --port %PORT%

pause
