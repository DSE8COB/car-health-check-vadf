# Get branches
$branches = git branch --format="%(refname:short)"

Write-Host ""
Write-Host "Available Branches"
Write-Host "------------------"

for ($i = 0; $i -lt $branches.Count; $i++) {
    Write-Host "$($i + 1). $($branches[$i])"
}

Write-Host ""

$baseIndex = Read-Host "Select Baseline Branch Number"
$reviewIndex = Read-Host "Select Review Branch Number"

$baseline = $branches[$baseIndex - 1]
$review = $branches[$reviewIndex - 1]

Write-Host ""
Write-Host "Baseline : $baseline"
Write-Host "Review   : $review"

git diff "$baseline..$review" | Out-File RT\pr-diff.patch -Encoding utf8

Write-Host ""
Write-Host "Diff generated:"
Write-Host "RT\pr-diff.patch"

Write-Host "Cleaning build folder..."
if (Test-Path ".\docs\_build") {
    Remove-Item ".\docs\_build" -Recurse -Force
}

Write-Host "Building Sphinx..."
Set-Location ".\docs"

sphinx-build -b html . _build

Write-Host "Copying ReviewTool JS/CSS..."
Copy-Item ..\RT\reviewtool.js .\_build\_static\reviewtool.js -Force
Copy-Item ..\RT\reviewtool.css .\_build\_static\reviewtool.css -Force
Copy-Item ..\RT\pr-diff.patch .\_build\pr-diff.patch -Force

Write-Host "Starting web server..."
python -m http.server 8000 --directory _build