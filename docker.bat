@echo off
echo Zalo Tools API - Docker Helper Script
echo ====================================
echo.

:menu
echo 1. Build Docker image
echo 2. Run with Docker Compose
echo 3. Stop Docker Compose
echo 4. View logs
echo 5. Rebuild and restart
echo 6. Exit
echo.

set /p choice="Select an option (1-6): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto run
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto rebuild
if "%choice%"=="6" goto exit

echo Invalid choice. Please try again.
echo.
goto menu

:build
echo Building Docker image...
docker build -t zalo-tools-api .
echo.
goto menu

:run
echo Starting services with Docker Compose...
docker-compose up -d
echo.
echo Services started! Check status at: http://localhost:3000/health
echo.
goto menu

:stop
echo Stopping Docker Compose services...
docker-compose down
echo.
goto menu

:logs
echo Showing logs (Press Ctrl+C to exit)...
docker-compose logs -f
goto menu

:rebuild
echo Rebuilding and restarting services...
docker-compose down
docker-compose up -d --build
echo.
echo Services restarted! Check status at: http://localhost:3000/health
echo.
goto menu

:exit
echo Goodbye!
exit /b 0
