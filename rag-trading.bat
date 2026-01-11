@echo off
REM RAG Swing Trading Pipeline Launcher
REM This batch file launches the RAG Swing Trading Pipeline application
REM Usage: rag-trading.bat or rag-trading (if in PATH)

setlocal enabledelayedexpansion

REM Get the project directory
for %%I in (%~dp0.) do set PROJECT_ROOT=%%~fI

REM Check if package.json exists
if not exist "%PROJECT_ROOT%\package.json" (
    echo Error: Could not find project root. Please ensure this script is in the RAG Trading project directory.
    exit /b 1
)

echo.
echo === RAG Swing Trading Pipeline ===
echo Project Root: %PROJECT_ROOT%
echo.

REM Change to project directory
cd /d "%PROJECT_ROOT%"

REM Check if node_modules exists
if not exist "%PROJECT_ROOT%\node_modules" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 exit /b 1
)

REM Check the mode parameter
if "%1"=="build" (
    echo Building for production...
    call npm run build
) else (
    echo Starting development server...
    echo.
    echo The app will open at:
    echo   Local:   http://localhost:5173/
    echo   Backend: http://localhost:3000/
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    call npm run dev
)
