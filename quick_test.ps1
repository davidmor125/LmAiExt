# Better Me Extension Quick Test Script
# זה סקריפט PowerShell לבדיקה מהירה של התוסף

Write-Host "🚀 Better Me Extension - Quick Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Chrome is installed
$chromePath = Get-Command chrome -ErrorAction SilentlyContinue
if (-not $chromePath) {
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (-not (Test-Path $chromePath)) {
        $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        if (-not (Test-Path $chromePath)) {
            Write-Host "❌ Chrome not found! Please install Chrome first." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "✅ Chrome found at: $chromePath" -ForegroundColor Green

# Check if extension files exist
$extensionPath = "c:\develop\bak\popupextenNew1"
$requiredFiles = @("manifest.json", "content.js", "background.js", "popup.html")

Write-Host "📁 Checking extension files..." -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $extensionPath $file
    if (Test-Path $filePath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - Missing!" -ForegroundColor Red
        $missingFiles = $true
    }
}

if ($missingFiles) {
    Write-Host "❌ Some extension files are missing. Please check the extension directory." -ForegroundColor Red
    exit 1
}

# Open Chrome with extensions page
Write-Host "🌐 Opening Chrome Extensions page..." -ForegroundColor Yellow
Start-Process $chromePath -ArgumentList "chrome://extensions/"

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Enable 'Developer mode' (toggle in top right)" -ForegroundColor White
Write-Host "2. Click 'Load unpacked'" -ForegroundColor White
Write-Host "3. Select folder: $extensionPath" -ForegroundColor White
Write-Host "4. Verify 'Better Me' extension is loaded and enabled" -ForegroundColor White

# Wait a bit then open test page
Start-Sleep -Seconds 3

Write-Host "🧪 Opening test page..." -ForegroundColor Yellow
$testPagePath = Join-Path $extensionPath "test_basic_extension.html"
$testPageUrl = "file:///$($testPagePath.Replace('\', '/'))"

Start-Process $chromePath -ArgumentList $testPageUrl

Write-Host ""
Write-Host "📋 Test Instructions:" -ForegroundColor Cyan
Write-Host "1. Make sure the extension is loaded and enabled" -ForegroundColor White
Write-Host "2. On the test page, select some text" -ForegroundColor White
Write-Host "3. Look for a floating menu with 'סכם טקסט מסומן' button" -ForegroundColor White
Write-Host "4. Click the button and check if dialog opens" -ForegroundColor White
Write-Host "5. Open Developer Tools (F12 key) to see console logs" -ForegroundColor White

Write-Host ""
Write-Host "🔧 If it doesn't work:" -ForegroundColor Yellow
Write-Host "- Check console for errors" -ForegroundColor White
Write-Host "- Try the 'Force Test Dialog' button on the test page" -ForegroundColor White
Write-Host "- Refresh the extension in chrome://extensions/" -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup complete! Check Chrome now." -ForegroundColor Green
