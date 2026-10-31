Set-Location -Path $PSScriptRoot
if (Test-Path ".\venv\Scripts\uvicorn.exe") {
    Write-Host "Starting Saathi Backend using virtual environment..." -ForegroundColor Cyan
    .\venv\Scripts\uvicorn.exe main:app --reload --port 8000
} else {
    Write-Host "Starting Saathi Backend using system Python..." -ForegroundColor Cyan
    uvicorn main:app --reload --port 8000
}

