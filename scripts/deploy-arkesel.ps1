# Deploy Arkesel SMS credentials to Supabase Edge Functions
# Reads ARKESEL credentials from .env in project root

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

# Load .env file
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

# Validate Arkesel credentials
if (-not $env:ARKESEL_API_KEY) {
  Write-Error "ARKESEL_API_KEY not found in .env"
}
if (-not $env:ARKESEL_SENDER_ID) {
  Write-Error "ARKESEL_SENDER_ID not found in .env"
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error @"
SUPABASE_ACCESS_TOKEN is required.

1. Create a token: https://supabase.com/dashboard/account/tokens
2. Run once:  npx supabase login
   OR add to .env:  SUPABASE_ACCESS_TOKEN=your_token_here
3. Re-run this script
"@
}

$projectRef = "gkzuzugokctccfadzqwf"

Write-Host "Setting Arkesel secrets in Supabase..."
$secrets = @(
  "ARKESEL_API_KEY=$($env:ARKESEL_API_KEY)"
  "ARKESEL_SENDER_ID=$($env:ARKESEL_SENDER_ID)"
)

if ($env:CHECKOUT_VERIFY_SECRET) {
  $secrets += "CHECKOUT_VERIFY_SECRET=$($env:CHECKOUT_VERIFY_SECRET)"
}

if ($env:CHECKOUT_OTP_DEV_MODE) {
  $secrets += "CHECKOUT_OTP_DEV_MODE=$($env:CHECKOUT_OTP_DEV_MODE)"
}

$secrets += "CHECKOUT_VERIFY_SECRET=$($env:CHECKOUT_VERIFY_SECRET)"
$secrets += "CHECKOUT_OTP_DEV_MODE=$($env:CHECKOUT_OTP_DEV_MODE)"

npx supabase secrets set @secrets --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying checkout-otp function..."
npx supabase functions deploy checkout-otp --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "✓ Done! SMS credentials deployed to Supabase."
Write-Host "  Function URL: https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/checkout-otp"
