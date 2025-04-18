@echo off
title Shimmer Cafe Launcher
echo Starting Shimmer Cafe Management System...
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in your PATH.
    echo Please reinstall Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm packages are installed
if not exist "node_modules" (
    echo First-time setup: Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Start the application
echo Starting server...
start /b cmd /c "npm run start"

:: Wait for server to start, but don't open browser
:: npm run start likely already opens a browser
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo Shimmer Cafe Management System is running.
echo Press any key to shut down the server and exit.
pause

:: Kill any running node processes when closing
taskkill /f /im node.exe >nul 2>nul
echo Server shut down. Goodbye!
timeout /t 2 /nobreak >nul