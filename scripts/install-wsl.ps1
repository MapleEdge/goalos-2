# =============================================================================
# GoalOS — WSL2 Installation Helper (Windows PowerShell)
# =============================================================================
# Run this script in an elevated PowerShell terminal to install WSL2 with
# Ubuntu. After WSL is installed, open an Ubuntu terminal and run:
#
#   cd /mnt/c/path/to/goalos     # or wherever you cloned the repo
#   ./scripts/setup-wsl.sh       # install Node, Docker, Yarn
#   ./scripts/setup-project.sh   # install deps, setup DB, seed data
#
# Usage (run as Administrator):
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\scripts\install-wsl.ps1
# =============================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "`n[STEP] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "[OK]   $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

# ── Check if WSL is already installed ────────────────────────────────────────

Write-Step "Checking WSL status..."

$wslInstalled = $false
try {
    $wslOutput = wsl --status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $wslInstalled = $true
    }
} catch {
    $wslInstalled = $false
}

if ($wslInstalled) {
    Write-Ok "WSL is already installed."

    # Check if Ubuntu is available
    $distros = wsl --list --quiet 2>&1
    if ($distros -match "Ubuntu") {
        Write-Ok "Ubuntu distribution found."
    } else {
        Write-Step "Installing Ubuntu distribution..."
        wsl --install -d Ubuntu --no-launch
        Write-Ok "Ubuntu installed. Launch it from the Start menu to complete initial setup."
    }
} else {
    Write-Step "Installing WSL2 with Ubuntu..."
    wsl --install -d Ubuntu

    Write-Ok "WSL2 installation initiated."
    Write-Warn "A reboot may be required. After rebooting:"
    Write-Warn "  1. Open 'Ubuntu' from the Start menu"
    Write-Warn "  2. Create your Linux username and password"
    Write-Warn "  3. Then run the setup scripts inside WSL"
}

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  WSL2 setup complete!                       " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps (inside your WSL Ubuntu terminal):"
Write-Host ""
Write-Host "  1. Clone or navigate to the GoalOS repo:"
Write-Host "     cd /mnt/c/Users/<YourUser>/path/to/goalos"
Write-Host ""
Write-Host "  2. Install system prerequisites:"
Write-Host "     chmod +x scripts/*.sh"
Write-Host "     ./scripts/setup-wsl.sh"
Write-Host ""
Write-Host "  3. Set up the project:"
Write-Host "     ./scripts/setup-project.sh"
Write-Host ""
Write-Host "  4. Start developing:"
Write-Host "     ./scripts/dev.sh"
Write-Host ""
