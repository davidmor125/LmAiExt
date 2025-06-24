# FINAL FIX SCRIPT - Better Me Extension Dialog Issue
# This script will help resolve the "dialog not opening" issue

Write-Host "🚨 FINAL FIX - Better Me Dialog Issue" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  Note: Running without admin privileges (this is usually fine)" -ForegroundColor Yellow
}

# Extension directory
$extensionDir = "c:\develop\bak\popupextenNew1"
Write-Host "📁 Extension directory: $extensionDir" -ForegroundColor Cyan

# Check files
$requiredFiles = @("content.js", "background.js", "manifest.json", "final_test_page.html")
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $extensionDir $file
    if (Test-Path $filePath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - MISSING!" -ForegroundColor Red
        exit 1
    }
}

# Find Chrome
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Host "❌ Chrome not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Chrome found: $chromePath" -ForegroundColor Green

# Close existing Chrome instances
Write-Host "🔄 Closing existing Chrome instances..." -ForegroundColor Yellow
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Chrome with extension
Write-Host "🚀 Starting Chrome with Better Me extension..." -ForegroundColor Cyan

$chromeArgs = @(
    "--load-extension=$extensionDir",
    "--new-window"
)

# Open Chrome extensions page
Write-Host "📂 Opening Chrome extensions page..." -ForegroundColor Yellow
Start-Process -FilePath $chromePath -ArgumentList ($chromeArgs + "chrome://extensions/")

Start-Sleep -Seconds 3

# Open test page
Write-Host "🧪 Opening final test page..." -ForegroundColor Yellow
$testPagePath = Join-Path $extensionDir "final_test_page.html"
$testPageUrl = "file:///" + $testPagePath.Replace("\", "/")
Start-Process -FilePath $chromePath -ArgumentList $testPageUrl

Start-Sleep -Seconds 2

# Open step-by-step debug page
Write-Host "🔍 Opening step-by-step debug page..." -ForegroundColor Yellow
$debugPagePath = Join-Path $extensionDir "step_by_step_debug.html"
$debugPageUrl = "file:///" + $debugPagePath.Replace("\", "/")
Start-Process -FilePath $chromePath -ArgumentList $debugPageUrl

Write-Host ""
Write-Host "🎯 CRITICAL TESTS TO PERFORM:" -ForegroundColor Red
Write-Host "==============================" -ForegroundColor Red
Write-Host ""
Write-Host "1️⃣  In extensions page - verify 'Better Me' is ENABLED (blue toggle)" -ForegroundColor White
Write-Host "2️⃣  In final test page - click 'בדוק תוסף' - should show ✅" -ForegroundColor White
Write-Host "3️⃣  In final test page - click 'פתח דיאלוג' - dialog should open" -ForegroundColor White
Write-Host "4️⃣  In final test page - select blue text - floating menu should appear" -ForegroundColor White
Write-Host "5️⃣  Click 'סכם טקסט מסומן' button - dialog should open" -ForegroundColor White
Write-Host ""
Write-Host "🔧 IF STEP 5 FAILS:" -ForegroundColor Yellow
Write-Host "  - Click 'הצג תפריט צף' to force show menu" -ForegroundColor White
Write-Host "  - Open Developer Tools (F12) Console" -ForegroundColor White
Write-Host "  - Look for red error messages" -ForegroundColor White
Write-Host "  - Check step-by-step debug page for detailed diagnostics" -ForegroundColor White
Write-Host ""
Write-Host "✅ ALL TABS OPENED - Check Chrome now!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 QUICK FIXES IF NEEDED:" -ForegroundColor Cyan
Write-Host "  - Refresh extension: chrome://extensions/ reload button" -ForegroundColor White
Write-Host "  - Refresh test pages: F5 or Ctrl+R" -ForegroundColor White
Write-Host "  - Check console: F12 Console tab" -ForegroundColor White
