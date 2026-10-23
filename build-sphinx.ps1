Write-Host "Cleaning build folder..."
if (Test-Path ".\docs\_build") {
    Remove-Item ".\docs\_build" -Recurse -Force
}

Write-Host "Building Sphinx..."
Set-Location ".\docs"

sphinx-build -b html . _build

Write-Host "Copying ReviewTool JS/CSS..."
Copy-Item ..\RT\* .\_build\_static\ -Force

Write-Host "Starting web server..."
python -m http.server 8000 --directory _build