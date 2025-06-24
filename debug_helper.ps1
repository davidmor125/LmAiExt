# PowerShell script to help load and test the Better Me extension

Write-Host "🚀 Better Me Extension - Debug Helper" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if Chrome is running
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
if ($chromeProcesses) {
    Write-Host "⚠️  Chrome is currently running. For best results, close Chrome first." -ForegroundColor Yellow
    Write-Host "   Close Chrome? (y/n): " -NoNewline -ForegroundColor Yellow
    $choice = Read-Host
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Write-Host "🔄 Closing Chrome..." -ForegroundColor Yellow
        Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Find Chrome executable
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
    Write-Host "❌ Chrome not found! Please install Google Chrome." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Chrome found: $chromePath" -ForegroundColor Green

# Extension directory
$extensionDir = "c:\develop\bak\popupextenNew1"
if (-not (Test-Path $extensionDir)) {
    Write-Host "❌ Extension directory not found: $extensionDir" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Extension directory found" -ForegroundColor Green

# Start Chrome with developer mode
Write-Host "🌐 Starting Chrome with developer flags..." -ForegroundColor Yellow

$chromeArgs = @(
    "--enable-extensions",
    "--load-extension=$extensionDir",
    "--new-window",
    "chrome://extensions/"
)

try {
    Start-Process -FilePath $chromePath -ArgumentList $chromeArgs
    Start-Sleep -Seconds 3
    
    Write-Host "✅ Chrome started with extension loaded" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. In Chrome, verify 'Better Me' extension is loaded and enabled" -ForegroundColor White
    Write-Host "2. If not visible, enable 'Developer mode' toggle" -ForegroundColor White
    Write-Host "3. Click 'Load unpacked' and select: $extensionDir" -ForegroundColor White
    Write-Host ""
    
    # Wait a bit then open test page
    Start-Sleep -Seconds 2
    Write-Host "🧪 Opening debug test page..." -ForegroundColor Yellow
    
    $testPagePath = Join-Path $extensionDir "step_by_step_debug.html"
    $testPageUrl = "file:///" + $testPagePath.Replace("\", "/")
    
    Start-Process -FilePath $chromePath -ArgumentList $testPageUrl
    
    Write-Host ""
    Write-Host "📋 Test Instructions:" -ForegroundColor Cyan
    Write-Host "1. Make sure all steps show green checkmarks" -ForegroundColor White
    Write-Host "2. Select text in the test area" -ForegroundColor White
    Write-Host "3. Look for floating menu with 'סכם טקסט מסומן' button" -ForegroundColor White
    Write-Host "4. Click the button and verify dialog opens" -ForegroundColor White
    Write-Host "5. Check console logs (F12) for any errors" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Setup complete! Check Chrome now." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error starting Chrome: $_" -ForegroundColor Red
    exit 1
}
