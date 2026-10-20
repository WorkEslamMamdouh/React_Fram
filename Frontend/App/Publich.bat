@echo off
title Next.js Production Build

color 0A

echo.
echo =====================================
echo        CLEANING CACHE
echo =====================================
echo.

IF EXIST .next (
    rd /s /q .next
)

echo.
echo =====================================
echo         INSTALL CHECK
echo =====================================
echo.

call npm install

echo.
echo =====================================
echo        BUILDING NEXT.JS APP
echo =====================================
echo.

call npm run build

IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo =====================================
    echo            BUILD FAILED
    echo =====================================
    echo.
    pause
    exit /b %ERRORLEVEL%
)

color 0A

echo.
echo =====================================
echo         BUILD FINISHED
echo =====================================
echo.

pause