# PowerShell script to clean up test files and documentation files
# Keep only the main extension files and MAIN_README.md

Write-Host "Starting cleanup process..." -ForegroundColor Green

# Get the current directory
$currentDir = Get-Location

Write-Host "Working in directory: $currentDir" -ForegroundColor Yellow

# Delete all .md files except MAIN_README.md
Write-Host "Deleting all .md files except MAIN_README.md..." -ForegroundColor Cyan
Get-ChildItem -Path $currentDir -Filter "*.md" | Where-Object { $_.Name -ne "MAIN_README.md" } | ForEach-Object {
    Write-Host "   Deleting: $($_.Name)" -ForegroundColor Red
    Remove-Item $_.FullName -Force
}

# Delete all .html test files (keep only popup.html and popup_window.html)
Write-Host "Deleting test .html files..." -ForegroundColor Cyan
$keepHtmlFiles = @("popup.html", "popup_window.html")
Get-ChildItem -Path $currentDir -Filter "*.html" | Where-Object { $_.Name -notin $keepHtmlFiles } | ForEach-Object {
    Write-Host "   Deleting: $($_.Name)" -ForegroundColor Red
    Remove-Item $_.FullName -Force
}

# Delete PowerShell script files except this cleanup script
Write-Host "Deleting other PowerShell scripts..." -ForegroundColor Cyan
Get-ChildItem -Path $currentDir -Filter "*.ps1" | Where-Object { $_.Name -ne "cleanup_final.ps1" } | ForEach-Object {
    Write-Host "   Deleting: $($_.Name)" -ForegroundColor Red
    Remove-Item $_.FullName -Force
}

Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "Remaining files:" -ForegroundColor Yellow

# Show remaining files
Get-ChildItem -Path $currentDir | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    Write-Host "   $($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "All test files and extra documentation have been removed!" -ForegroundColor Green
Write-Host "Main instructions are now in MAIN_README.md" -ForegroundColor Yellow
