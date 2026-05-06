@echo off
setlocal enabledelayedexpansion

REM Always run from daemon directory (even from Task Scheduler).
set "DAEMON_DIR=%~dp0"
pushd "%DAEMON_DIR%" || exit /b 1

if not exist "logs" mkdir "logs"

set "LOG_FILE=logs\daemon.log"

>> "%LOG_FILE%" echo.
>> "%LOG_FILE%" echo [%date% %time%] [start-daemon] launching devtrack daemon...

REM Append stdout+stderr to the log file.
node "src\tracker.js" >> "%LOG_FILE%" 2>>&1

set "EXIT_CODE=%ERRORLEVEL%"
>> "%LOG_FILE%" echo [%date% %time%] [start-daemon] daemon exited (code=%EXIT_CODE%).

popd
exit /b %EXIT_CODE%

