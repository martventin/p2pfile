@echo off
REM Windows Batch File to Start Both UtilityPro Servers
REM Save as: start-servers.bat
REM Double-click to run both servers

echo.
echo ============================================================
echo    🚀 UtilityPro - Starting Both Servers
echo ============================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js detected: 
node --version
echo.

REM Start Static File Server in new window
echo 📁 Starting Static File Server (Port 8000)...
start "Static File Server - Port 8000" node static-server.js
timeout /t 2 /nobreak

REM Start API Server in new window  
echo 📊 Starting API Server (Port 3000)...
start "API Server - Port 3000" node server.js

echo.
echo ============================================================
echo ✓ Both servers started!
echo.
echo 📍 APP URL: http://192.168.1.105:8000
echo 📍 LOCAL:   http://localhost:8000
echo.
echo ✓ Access the app in your browser
echo ✓ Do NOT close this window or the server windows
echo ============================================================
echo.

pause
