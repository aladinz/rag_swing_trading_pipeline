#!/usr/bin/env pwsh

# Start the RAG Swing-Trading Pipeline development server

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RAG Swing-Trading Pipeline" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Change to project directory
Set-Location $scriptDir

# Check if node_modules exists, if not install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --legacy-peer-deps --no-fund
    Write-Host "Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

# Run the dev server
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Opening browser to http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Open the browser
Start-Process "http://localhost:5173"

# Wait a moment for the server to start
Start-Sleep -Seconds 2

# Run the dev server
npm run dev
