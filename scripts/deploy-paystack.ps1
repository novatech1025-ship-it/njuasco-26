# Deploy NJUASCO Paystack checkout to Supabase Edge Functions.
# Requires PAYSTACK_SECRET_KEY in .env or the current environment.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim().Trim('"').Trim("'")
      if ($name -and -not (Get-Item "env:$name" -ErrorAction SilentlyContinue)) {
        Set-Item -Path "env:$name" -Value $value
      }
    }
  }
}

if (-not $env:PAYSTACK_SECRET_KEY) {
  Write-Error "PAYSTACK_SECRET_KEY not found. Add it to .env or set the environment variable."
}

$projectRef = "gkzuzugokctccfadzqwf"

Write-Host "Setting Paystack secret..."
npx supabase secrets set "PAYSTACK_SECRET_KEY=$($env:PAYSTACK_SECRET_KEY)" --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying paystack-checkout..."
npx supabase functions deploy paystack-checkout --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Function URL: https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/paystack-checkout"
