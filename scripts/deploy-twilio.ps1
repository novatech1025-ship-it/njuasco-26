# Deploy Twilio SMS credentials to Supabase Edge Functions
# Reads TWILIO credentials from .env in project root

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

# Validate Twilio credentials
if (-not $env:TWILIO_ACCOUNT_SID) {
  Write-Error "TWILIO_ACCOUNT_SID not found in .env"
}
if (-not $env:TWILIO_AUTH_TOKEN) {
  Write-Error "TWILIO_AUTH_TOKEN not found in .env"
}
if (-not $env:TWILIO_FROM_NUMBER -and -not $env:TWILIO_MESSAGING_SERVICE_SID) {
  Write-Error "Either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID must be set in .env"
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

Write-Host "Setting Twilio secrets in Supabase..."
$secrets = @(
  "TWILIO_ACCOUNT_SID=$($env:TWILIO_ACCOUNT_SID)"
  "TWILIO_AUTH_TOKEN=$($env:TWILIO_AUTH_TOKEN)"
)

if ($env:TWILIO_FROM_NUMBER) {
  $secrets += "TWILIO_FROM_NUMBER=$($env:TWILIO_FROM_NUMBER)"
  Write-Host "  ✓ Using FROM_NUMBER: $($env:TWILIO_FROM_NUMBER)"
}

if ($env:TWILIO_MESSAGING_SERVICE_SID) {
  $secrets += "TWILIO_MESSAGING_SERVICE_SID=$($env:TWILIO_MESSAGING_SERVICE_SID)"
  Write-Host "  ✓ Using SERVICE_SID: $($env:TWILIO_MESSAGING_SERVICE_SID)"
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
