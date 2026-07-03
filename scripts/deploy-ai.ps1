# Deploy NJB City AI to Supabase Edge Functions.
# Requires: npx supabase login   (one-time)
# Reads GROQ_API_KEY from .env in project root.

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

if (-not $env:GROQ_API_KEY) {
  Write-Error "GROQ_API_KEY not found. Add it to .env or set the environment variable."
}

$projectRef = "gkzuzugokctccfadzqwf"
$model = if ($env:GROQ_MODEL) { $env:GROQ_MODEL } else { "llama-3.1-8b-instant" }

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error @"
SUPABASE_ACCESS_TOKEN is required.

1. Create a token: https://supabase.com/dashboard/account/tokens
2. Run once:  npx supabase login
   OR add to .env:  SUPABASE_ACCESS_TOKEN=your_token_here
3. Re-run:  .\scripts\deploy-ai.ps1
"@
}

Write-Host "Setting Supabase secrets..."
npx supabase secrets set "GROQ_API_KEY=$($env:GROQ_API_KEY)" "GROQ_MODEL=$model" --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying njuasco-ai..."
npx supabase functions deploy njuasco-ai --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Test: https://gkzuzugokctccfadzqwf.supabase.co/functions/v1/njuasco-ai"
