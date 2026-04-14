# ============================================================
#  bundle_report.ps1
#  Packages the LaTeX report + all diagram PNGs into a
#  ready-to-upload ZIP (e.g. for Overleaf).
#  Run from the project root:
#    .\bundle_report.ps1
# ============================================================

$projectRoot = $PSScriptRoot          # folder this script lives in
$zipName     = "NITK_Report_Bundle.zip"
$zipPath     = Join-Path $projectRoot $zipName

# ── Files / folders to include ───────────────────────────────
$texFile     = Join-Path $projectRoot "Project_Report_NITK.tex"
$diagramsDir = Join-Path $projectRoot "diagrams"

# ── Validate inputs ─────────────────────────────────────────
if (-not (Test-Path $texFile)) {
    Write-Error "Cannot find Project_Report_NITK.tex in $projectRoot"
    exit 1
}
if (-not (Test-Path $diagramsDir)) {
    Write-Error "Cannot find diagrams\ folder in $projectRoot"
    exit 1
}

# ── Remove old ZIP if it exists ──────────────────────────────
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Removed old $zipName" -ForegroundColor DarkGray
}

# ── Collect diagram files (PNGs + SVGs) ─────────────────────
$diagrams = Get-ChildItem $diagramsDir -Include "*.png","*.svg" -Recurse

if ($diagrams.Count -eq 0) {
    Write-Warning "No PNG or SVG files found in diagrams\. Run 'node diagrams\convert.js' first."
}

# ── Create a temp staging directory ─────────────────────────
$staging = Join-Path $env:TEMP "nitk_report_stage"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path "$staging\diagrams" | Out-Null

# ── Copy .tex ────────────────────────────────────────────────
Copy-Item $texFile "$staging\Project_Report_NITK.tex"
Write-Host "  [+] Project_Report_NITK.tex" -ForegroundColor Cyan

# ── Copy diagrams ────────────────────────────────────────────
foreach ($file in $diagrams) {
    Copy-Item $file.FullName "$staging\diagrams\$($file.Name)"
    Write-Host "  [+] diagrams\$($file.Name)" -ForegroundColor Cyan
}

# ── ZIP everything ───────────────────────────────────────────
Compress-Archive -Path "$staging\*" -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $staging -Recurse -Force

# ── Done ─────────────────────────────────────────────────────
$size = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Bundle ready: $zipName  ($size KB)" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Upload to Overleaf:" -ForegroundColor Yellow
Write-Host "  1. Go to https://www.overleaf.com"
Write-Host "  2. New Project -> Upload Project"
Write-Host "  3. Select: $zipPath"
Write-Host "  4. Set main file to: Project_Report_NITK.tex"
Write-Host "  5. Click Recompile"
Write-Host ""

# ── Optional: open the folder in Explorer ───────────────────
$open = Read-Host "Open folder in Explorer? (y/n)"
if ($open -eq "y") { Start-Process explorer.exe $projectRoot }
