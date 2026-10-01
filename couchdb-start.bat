@echo off
:: CouchDB Startup Script for UtilityPro (Windows)
:: This script starts CouchDB on Windows

echo.
echo ======================================
echo  CouchDB Startup Script
echo ======================================
echo.

REM Check if CouchDB is already running
curl -s http://localhost:5984 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] CouchDB is already running on http://localhost:5984
    echo.
    echo To access CouchDB Admin Panel:
    echo   http://localhost:5984/_utils
    echo.
    pause
    exit /b 0
)

echo [INFO] Attempting to start CouchDB...
echo.

REM Try Method 1: Direct command if CouchDB is in PATH
couchdb -b 2>nul
if %ERRORLEVEL% EQU 0 (
    timeout /t 2 /nobreak
    echo [OK] CouchDB started successfully!
    echo.
    echo Access CouchDB Admin Panel at:
    echo   http://localhost:5984/_utils
    echo.
    echo You can now run: node server.js
    echo.
    pause
    exit /b 0
)

REM Try Method 2: Look for CouchDB in Program Files
if exist "C:\Program Files\CouchDB\bin\couchdb.exe" (
    echo [INFO] Found CouchDB in Program Files...
    "C:\Program Files\CouchDB\bin\couchdb.exe" -b
    timeout /t 2 /nobreak
    echo [OK] CouchDB started successfully!
    echo.
    echo Access CouchDB Admin Panel at:
    echo   http://localhost:5984/_utils
    echo.
    echo You can now run: node server.js
    echo.
    pause
    exit /b 0
)

REM Try Method 3: Look for CouchDB in Program Files (x86)
if exist "C:\Program Files (x86)\CouchDB\bin\couchdb.exe" (
    echo [INFO] Found CouchDB in Program Files (x86)...
    "C:\Program Files (x86)\CouchDB\bin\couchdb.exe" -b
    timeout /t 2 /nobreak
    echo [OK] CouchDB started successfully!
    echo.
    echo Access CouchDB Admin Panel at:
    echo   http://localhost:5984/_utils
    echo.
    echo You can now run: node server.js
    echo.
    pause
    exit /b 0
)

REM If all methods failed
echo.
echo [ERROR] CouchDB not found or could not start!
echo.
echo Please install CouchDB from: https://couchdb.apache.org/
echo Or add CouchDB to your system PATH
echo.
echo Installation steps:
echo  1. Download CouchDB for Windows from: https://couchdb.apache.org/
echo  2. Run the installer (make sure to check "Install as Service")
echo  3. After installation, try running this script again
echo.
pause
exit /b 1
