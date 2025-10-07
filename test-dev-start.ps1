# PowerShell script to test dev server startup
Write-Host "Testing Next.js dev server startup..." -ForegroundColor Cyan

# Kill any existing processes on port 3000
$processOnPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($processOnPort) {
    Write-Host "Killing existing process on port 3000..." -ForegroundColor Yellow
    Stop-Process -Id $processOnPort.OwningProcess -Force
    Start-Sleep -Seconds 2
}

# Clear Next.js cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue

# Start dev server with verbose output
Write-Host "Starting dev server..." -ForegroundColor Green
Write-Host "If it hangs, press Ctrl+C and report the last output you see." -ForegroundColor Yellow
Write-Host "" -ForegroundColor White

npm run dev