<#
Start-dev.ps1

Starts the frontend Vite dev server and the Tauri (Rust) dev process in separate PowerShell windows.

Usage:
  - Double-click this script in Explorer, or run from PowerShell:
      powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
  - To run everything in the current window (no new windows):
      powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -NoNewWindows

The script will try to locate a common location for vcvars64.bat (MSVC). If found, it will run
vcvars64 before launching the Tauri dev command so the linker and build tools are available.

Adjust the $vcvarsCandidates array below if your Visual Studio install path differs.
#>

param(
    [switch]$NoNewWindows
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$frontend = Join-Path $root 'frontend'
$srcTauri = Join-Path $root 'src-tauri'

$vcvarsCandidates = @(
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\VC\Auxiliary\Build\vcvars64.bat"
)

$vcvars = $vcvarsCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

function Start-FrontendInNewWindow {
    param($path)
    $cmd = "Set-Location -LiteralPath '$path'; npm run dev"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $cmd
}

function Start-BackendInNewWindow {
    param($path, $vcvarsPath)
    if ($vcvarsPath) {
        $cmd = "& '$vcvarsPath' ; Set-Location -LiteralPath '$path' ; npx @tauri-apps/cli@2 dev"
    } else {
        $cmd = "Write-Warning 'vcvars64.bat not found; attempting to run without MSVC env' ; Set-Location -LiteralPath '$path' ; npx @tauri-apps/cli@2 dev"
    }
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $cmd
}

if ($NoNewWindows) {
    Write-Host "Starting frontend in background job (current window): $frontend"
    # Start frontend in a background job so this script can continue in the current window.
    Start-Job -ScriptBlock {
        param($p)
        Set-Location -LiteralPath $p
        npm run dev
    } -ArgumentList $frontend | Out-Null

    if (-not $vcvars) {
        Write-Warning "vcvars64.bat not found; backend will be started without MSVC environment (may fail)."
    }

    Write-Host "Starting backend in current window: $srcTauri"
    if ($vcvars) { & $vcvars }
    Push-Location $srcTauri
    npx @tauri-apps/cli@2 dev
    Pop-Location
    return
}

Start-FrontendInNewWindow -path $frontend
Start-BackendInNewWindow -path $srcTauri -vcvarsPath $vcvars

Write-Host "Started frontend and backend in new PowerShell windows."

