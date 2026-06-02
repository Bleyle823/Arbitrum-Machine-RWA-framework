# Optional: refresh rwa-hardhat from packages/rwa/contracts (run from rwa-hardhat/)
$ErrorActionPreference = "Stop"
$src = Join-Path $PSScriptRoot "..\..\packages\rwa\contracts"
$dst = $PSScriptRoot ".."
if (-not (Test-Path $src)) {
  Write-Error "Monorepo copy not found at $src"
}
robocopy $src $dst /E /XD node_modules cache artifacts typechain-types deployments /XF package-lock.json package.json README.md .env.example | Out-Null
Write-Host "Synced sources from packages/rwa/contracts (kept local package.json and README)."
