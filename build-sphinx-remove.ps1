Write-Host "Cleaning build folder..."
if (Test-Path ".\docs\_build") {
    Remove-Item ".\docs\_build" -Recurse -Force
}