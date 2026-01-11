@echo off
setlocal enabledelayedexpansion

REM Start the RAG Swing-Trading Pipeline development server
REM This script navigates to the project directory and runs the dev server

cd /d "%~dp0"

echo.
echo ========================================
echo RAG Swing-Trading Pipeline
echo ========================================
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps --no-fund
    echo Dependencies installed.
    echo.
)

echo Starting development server...
echo Opening browser to http://localhost:5173
echo.
REM Open the browser
start http://localhost:5173

REM Wait a moment for the server to start
timeout /t 2 /nobreak

REM Run the dev server with proper Windows environment variable syntax
setlocal
set NODE_ENV=development
call npm run dev
endlocal
