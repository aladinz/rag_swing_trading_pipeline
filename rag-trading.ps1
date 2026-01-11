# RAG Swing Trading Pipeline Launcher
# This script launches the RAG Swing Trading Pipeline application
# Usage: rag-trading [--dev|--build]

param(
    [ValidateSet('dev', 'build', '')]
    [string]$Mode = 'dev'
)

# Get the script directory (project root)
$projectRoot = Split-Path -Parent $MyInvocation.MyCommandPath

# Check if we're in the project directory
if (-not (Test-Path "$projectRoot/package.json")) {
    Write-Host "Error: Could not find project root. Please ensure this script is in the RAG Trading project directory." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== RAG Swing Trading Pipeline ===" -ForegroundColor Cyan
Write-Host "Project Root: $projectRoot" -ForegroundColor Gray

# Change to project directory
Set-Location $projectRoot

# Check if node_modules exists
if (-not (Test-Path "$projectRoot/node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# Run the appropriate command
switch ($Mode) {
    'build' {
        Write-Host "Building for production..." -ForegroundColor Yellow
        npm run build
    }
    default {
        Write-Host "Starting development server..." -ForegroundColor Green
        Write-Host "The app will open at:" -ForegroundColor Gray
        Write-Host "  Local:   http://localhost:5173/" -ForegroundColor Cyan
        Write-Host "  Backend: http://localhost:3000/" -ForegroundColor Cyan
        Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Gray
        npm run dev
    }
}
