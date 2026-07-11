#!/usr/bin/env node
/**
 * Deploy Arkesel secrets to Supabase using the Management API
 * Requires: SUPABASE_ACCESS_TOKEN environment variable
 */

const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)=(.*)$/);
  if (match) {
    const name = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    if (name) envVars[name] = value;
  }
});

const projectRef = 'gkzuzugokctccfadzqwf';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN not set');
  console.error('\nTo set it:');
  console.error('1. Go to: https://supabase.com/dashboard/account/tokens');
  console.error('2. Create a token');
  console.error('3. Add to .env: SUPABASE_ACCESS_TOKEN=your_token_here');
  console.error('4. Run this script again');
  process.exit(1);
}

const secrets = {
  ARKESEL_API_KEY: envVars.ARKESEL_API_KEY,
  ARKESEL_SENDER_ID: envVars.ARKESEL_SENDER_ID,
  CHECKOUT_VERIFY_SECRET: envVars.CHECKOUT_VERIFY_SECRET,
  CHECKOUT_OTP_DEV_MODE: envVars.CHECKOUT_OTP_DEV_MODE,
};

console.log('Setting Arkesel secrets in Supabase...');
console.log(`Project: ${projectRef}`);
console.log(`Secrets to deploy:`);
Object.entries(secrets).forEach(([key, value]) => {
  if (value) {
    const display = key.includes('TOKEN') ? '***' : value;
    console.log(`  ✓ ${key}=${display}`);
  }
});

async function setSsecrets() {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/secrets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          Object.entries(secrets)
            .filter(([, v]) => v)
            .map(([name, value]) => ({ name, value }))
        ),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`\nERROR ${response.status}:`, error);
      process.exit(1);
    }

    console.log('\n✓ Secrets deployed successfully!');
    console.log('\nNow deploying checkout-otp function...');
    
    // Next: deploy the function
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

setSsecrets();
