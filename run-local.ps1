<#
.SYNOPSIS
    Starts the HomeoOpinion stack locally (NestJS backend + Next.js frontend).

.DESCRIPTION
    - Brings up PostgreSQL via docker compose (named volume, data persists).
    - Installs dependencies if node_modules is missing (or with -Install).
    - Runs `prisma generate` and `prisma db push` (no migrations dir in this repo).
    - Optionally seeds the database with -Seed.
    - Launches backend (:3001) and frontend (:3000) each in its own window.

.EXAMPLE
    .\run-local.ps1
    .\run-local.ps1 -Install -Seed
    .\run-local.ps1 -SkipDb
#>
[CmdletBinding()]
param(
    [switch]$Install,   # Force `npm install` in both apps
    [switch]$Seed,      # Run `prisma db seed` after schema push
    [switch]$SkipDb     # Skip prisma generate / db push
)

$ErrorActionPreference = 'Stop'
$root     = $PSScriptRoot
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg"   -ForegroundColor Green }
function Write-Warn2($m)  { Write-Host "    $m"     -ForegroundColor Yellow }

# --- 1. Pre-flight checks -------------------------------------------------
Write-Step 'Checking prerequisites'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is not installed or not on PATH.'
}
Write-Ok "node $(node --version)"

foreach ($f in @("$backend\.env", "$frontend\.env.local")) {
    if (-not (Test-Path $f)) { Write-Warn2 "Missing env file: $f" }
    else { Write-Ok "Found $($f.Replace($root, '.'))" }
}

# --- 2. Postgres via docker compose (localhost:5433) ----------------------
Write-Step 'Starting Postgres (docker compose)'

function Test-PgPort {
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $iar = $c.BeginConnect('localhost', 5433, $null, $null)
        $up = $iar.AsyncWaitHandle.WaitOne(2000) -and $c.Connected
        $c.Close(); return $up
    } catch { return $false }
}

if ($SkipDb) {
    Write-Warn2 'Skipping DB startup (-SkipDb).'
} elseif (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warn2 'docker not on PATH; cannot manage the DB container.'
    if (-not (Test-PgPort)) {
        $ans = Read-Host '    Postgres not reachable. Continue anyway? (y/N)'
        if ($ans -ne 'y') { throw 'Aborted: database not available.' }
    } else { Write-Ok 'Postgres already reachable on :5433.' }
} else {
    # Ensure the Docker engine is up (Docker Desktop may be closed).
    docker info *> $null
    if (-not $?) {
        Write-Warn2 'Docker engine not running; launching Docker Desktop...'
        $dd = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
        if (Test-Path $dd) { Start-Process $dd } else { throw 'Docker Desktop not found. Start Docker manually.' }
        for ($i = 0; $i -lt 40; $i++) { docker info *> $null; if ($?) { break }; Start-Sleep 5 }
        if (-not $?) { throw 'Docker engine did not become ready in time.' }
        Write-Ok 'Docker engine is ready.'
    }

    Push-Location $root
    try { docker compose up -d } finally { Pop-Location }

    Write-Host -NoNewline '    Waiting for Postgres health'
    $pgUp = $false
    for ($i = 0; $i -lt 30; $i++) {
        $h = (docker inspect --format '{{.State.Health.Status}}' homeopinion-db 2>$null)
        if ($h -eq 'healthy') { $pgUp = $true; break }
        Write-Host -NoNewline '.'; Start-Sleep 2
    }
    Write-Host ''
    if ($pgUp) { Write-Ok 'Postgres is healthy on localhost:5433.' }
    else { throw 'Postgres container did not become healthy. Check: docker compose logs db' }
}

# --- 3. Install dependencies ----------------------------------------------
function Ensure-Deps($dir, $name) {
    if ($Install -or -not (Test-Path (Join-Path $dir 'node_modules'))) {
        Write-Step "Installing $name dependencies"
        Push-Location $dir
        try { npm install } finally { Pop-Location }
    } else {
        Write-Ok "$name dependencies present (use -Install to reinstall)."
    }
}
Ensure-Deps $backend  'backend'
Ensure-Deps $frontend 'frontend'

# --- 4. Prisma generate + schema push -------------------------------------
if (-not $SkipDb) {
    Write-Step 'Prisma: generate client'
    Push-Location $backend
    try {
        npx prisma generate
        Write-Step 'Prisma: db push (sync schema)'
        npx prisma db push
        if ($Seed) {
            Write-Step 'Prisma: seed'
            npx prisma db seed
        }
    } finally { Pop-Location }
} else {
    Write-Warn2 'Skipping Prisma (--SkipDb).'
}

# --- 5. Launch backend + frontend in separate windows ---------------------
Write-Step 'Starting servers'

Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$backend'; Write-Host 'BACKEND  http://localhost:3001' -ForegroundColor Cyan; npm run start:dev"
)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$frontend'; Write-Host 'FRONTEND http://localhost:3000' -ForegroundColor Cyan; npm run dev"
)

Write-Host ''
Write-Ok 'Backend  -> http://localhost:3001'
Write-Ok 'Frontend -> http://localhost:3000'
Write-Host "`nEach server runs in its own window. Close those windows to stop them." -ForegroundColor Cyan
