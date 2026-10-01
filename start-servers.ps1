# PowerShell Script to Start Both UtilityPro Servers
# Save as: start-servers.ps1
# Run: powershell -ExecutionPolicy Bypass -File start-servers.ps1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   🚀 UtilityPro - Starting Both Servers" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""

# Get current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Start Static File Server
Write-Host "📁 Starting Static File Server (Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node static-server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start API Server
Write-Host "📊 Starting API Server (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js" -WindowStyle Normal

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "✓ Both servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 APP URL: http://192.168.1.105:8000" -ForegroundColor Yellow
Write-Host "📍 LOCAL:   http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ Access the app in your browser" -ForegroundColor Green
Write-Host "✓ Do NOT close the server windows" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host
