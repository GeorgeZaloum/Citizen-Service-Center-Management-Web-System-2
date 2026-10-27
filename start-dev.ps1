# Starts the development servers of the project, each in its own window:
#   backend   Django on http://localhost:8000   (Swagger UI: /api/docs/)
#   frontend  Vite   on http://localhost:5173   (forwards /api to the backend)
#
# Usage (from this folder):
#   .\start-dev.ps1            backend + frontend connected to the real backend
#   .\start-dev.ps1 -Mock      frontend only, with the in-memory mock server (no database needed)
#   .\start-dev.ps1 -Setup     first run: venv, pip install, migrate, seed data, npm install; then start
#   .\start-dev.ps1 -NoBrowser do not open the browser
[CmdletBinding()]
param(
    [switch]$Mock,
    [switch]$Setup,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend "venv\Scripts\python.exe"
$FrontendUrl = "http://localhost:5173"

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Green }
function Stop-WithError([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}
# Vite listens on ::1 and Django on 127.0.0.1, so both addresses are tried. A short timeout
# keeps the waiting loops fast (a refused connection can take seconds on Windows).
function Test-Port([int]$Port) {
    foreach ($address in @("127.0.0.1", "::1")) {
        $client = New-Object System.Net.Sockets.TcpClient([System.Net.IPAddress]::Parse($address).AddressFamily)
        try {
            if ($client.ConnectAsync($address, $Port).Wait(400) -and $client.Connected) { return $true }
        } catch {
            # Refused: try the next address.
        } finally {
            $client.Dispose()
        }
    }
    return $false
}
function Invoke-Checked([string]$Description, [scriptblock]$Command) {
    Write-Step $Description
    & $Command
    if ($LASTEXITCODE -ne 0) { Stop-WithError "$Description failed (exit code $LASTEXITCODE)." }
}

# ---------------------------------------------------------------- prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Stop-WithError "Node.js is not installed (https://nodejs.org)." }

if (-not $Mock) {
    if (-not (Test-Path (Join-Path $Root ".env"))) {
        Stop-WithError "Missing .env: copy .env.example to .env and set DB_PASSWORD, DJANGO_SECRET_KEY and SEED_ADMIN_PASSWORD."
    }
    if (-not (Test-Port 5432)) {
        Stop-WithError "PostgreSQL is not answering on port 5432. Start the PostgreSQL service first."
    }
}

# ---------------------------------------------------------------- first-run setup
if ($Setup) {
    if (-not $Mock) {
        if (-not (Test-Path $Python)) {
            Invoke-Checked "Creating the Python virtual environment" { python -m venv (Join-Path $Backend "venv") }
        }
        Invoke-Checked "Installing backend packages" { & $Python -m pip install -r (Join-Path $Backend "requirements.txt") }
        Push-Location $Backend
        try {
            Invoke-Checked "Applying database migrations" { & $Python manage.py migrate }
            Invoke-Checked "Seeding departments, center settings and the System Administrator" { & $Python manage.py seed_data }
            Invoke-Checked "Seeding demo accounts" { & $Python manage.py seed_local_data }
        } finally {
            Pop-Location
        }
    }
    Push-Location $Frontend
    try {
        Invoke-Checked "Installing frontend packages" { npm install }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Stop-WithError "Frontend packages are missing. Run: .\start-dev.ps1 -Setup"
}
if (-not $Mock -and -not (Test-Path $Python)) {
    Stop-WithError "The backend virtual environment is missing. Run: .\start-dev.ps1 -Setup"
}
if (Test-Port 5173) { Stop-WithError "Port 5173 is already in use. Close the other frontend server first." }

# ---------------------------------------------------------------- start
if (-not $Mock) {
    if (Test-Port 8000) { Stop-WithError "Port 8000 is already in use. Close the other backend server first." }

    Push-Location $Backend
    try {
        # Fails fast if a migration is missing, before the servers start.
        & $Python manage.py migrate --check | Out-Null
        if ($LASTEXITCODE -ne 0) { Stop-WithError "The database has unapplied migrations. Run: .\start-dev.ps1 -Setup" }
    } finally {
        Pop-Location
    }

    Write-Step "Starting the backend on http://localhost:8000"
    Start-Process powershell -WorkingDirectory $Backend -ArgumentList @(
        "-NoExit", "-NoProfile", "-Command",
        "`$Host.UI.RawUI.WindowTitle = 'CSC backend :8000'; & '.\venv\Scripts\python.exe' manage.py runserver 8000"
    )

    Write-Host "    waiting for the backend" -NoNewline
    for ($i = 0; $i -lt 40 -and -not (Test-Port 8000); $i++) {
        Start-Sleep -Milliseconds 500
        Write-Host "." -NoNewline
    }
    Write-Host ""
    if (-not (Test-Port 8000)) { Stop-WithError "The backend did not start. Read the error in the backend window." }
}

$UseMocks = if ($Mock) { "true" } else { "false" }
$ModeLabel = if ($Mock) { "mock server" } else { "real backend" }
Write-Step "Starting the frontend on $FrontendUrl ($ModeLabel)"
# VITE_USE_MOCKS from the environment takes priority over frontend\.env.local.
Start-Process powershell -WorkingDirectory $Frontend -ArgumentList @(
    "-NoExit", "-NoProfile", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'CSC frontend :5173 ($ModeLabel)'; `$env:VITE_USE_MOCKS = '$UseMocks'; npm run dev"
)

for ($i = 0; $i -lt 60 -and -not (Test-Port 5173); $i++) { Start-Sleep -Milliseconds 500 }
if (-not (Test-Port 5173)) { Stop-WithError "The frontend did not start. Read the error in the frontend window." }

Write-Host ""
Write-Host "Ready:" -ForegroundColor Green
Write-Host "  Frontend    $FrontendUrl"
if (-not $Mock) {
    Write-Host "  Backend     http://localhost:8000/api/v1/"
    Write-Host "  Swagger UI  http://localhost:8000/api/docs/"
}
Write-Host "  Demo password for the demo accounts: Demo-Pass1 (README.md, 'Seeded accounts')"
Write-Host "  Close the server windows to stop them."

if (-not $NoBrowser) { Start-Process $FrontendUrl }
