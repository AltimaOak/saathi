@echo off
cd /d "%~dp0"
if exist "venv\Scripts\uvicorn.exe" (
    echo Starting Saathi Backend using virtual environment...
    venv\Scripts\uvicorn.exe main:app --reload --port 8000
) else (
    echo Starting Saathi Backend using system Python...
    uvicorn main:app --reload --port 8000
)

