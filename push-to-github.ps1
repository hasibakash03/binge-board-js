# push-to-github.ps1  -  run this yourself from the project folder:  .\push-to-github.ps1
# It publishes this project as the public GitHub repo "binge-board-js".
# No token or password is stored here. GitHub login comes from `gh auth login` or Git's own sign-in window.
param(
  [string]$Username = "hasibakash03"   # your GitHub username (used only by the manual fallback)
)

$ErrorActionPreference = "Stop"
$repo = "binge-board-js"

# Step 1: work from the folder this script lives in
Set-Location $PSScriptRoot

# Step 2: make sure this folder is a git repo with at least one commit
if (-not (Test-Path ".git")) { throw "No .git folder here. Run 'git init -b main' and commit first." }
git rev-parse HEAD *> $null
if ($LASTEXITCODE -ne 0) { throw "No commit yet. Run 'git add -A' and 'git commit -m ...' first." }

# Step 3: is GitHub CLI (gh) installed and logged in?
$ghReady = $false
if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh auth status *> $null
  if ($LASTEXITCODE -eq 0) { $ghReady = $true }
}

if ($ghReady) {
  # Step 4 (main path): gh creates the public repo, adds remote "origin" and pushes in one go
  gh repo create $repo --public --source . --remote origin --push
  Write-Host "Done. Repo: https://github.com/$Username/$repo"
}
else {
  # Step 4 (fallback): do it by hand
  Write-Host "gh is missing or not logged in. Manual steps:"
  Write-Host "  1. Open https://github.com/new"
  Write-Host "  2. Repository name: $repo   Visibility: Public"
  Write-Host "  3. Do NOT add a README, .gitignore or license (the repo must stay empty)"
  Write-Host "  4. Click 'Create repository', then come back here"
  Read-Host "Press Enter after the empty repo exists"

  # Step 5: point 'origin' at the new repo (replace it if it already exists)
  git remote remove origin 2>$null
  git remote add origin "https://github.com/$Username/$repo.git"

  # Step 6: push main; Git will open its own sign-in window if needed
  git push -u origin main
  Write-Host "Done. Repo: https://github.com/$Username/$repo"
}
