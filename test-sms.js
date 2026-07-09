#!/usr/bin/env node
/**
 * Test checkout OTP SMS locally
 */

const http = require('http');

async function testCheckoutOTP() {
  console.log('Testing checkout OTP SMS locally...\n');

  const payload = JSON.stringify({
    action: 'send',
    phone: '+233244123456', // Test with a Ghana customer number
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkout-otp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response:\n${data}\n`);

        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            console.log('✓ SMS sent successfully!');
            if (parsed.devCode) {
              console.log(`  Dev Code: ${parsed.devCode}`);
            }
            console.log(`  Message: ${parsed.message}`);
          } else {
            console.log('✗ Error:', parsed.error);
          }
        } catch (e) {
          console.log('Response is not JSON');
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Request failed:', e.message);
      reject(e);
    });

    console.log('Sending request to http://localhost:3000/api/checkout-otp');
    console.log(`Payload: ${payload}\n`);
    req.write(payload);
    req.end();
  });
}

testCheckoutOTP().catch(console.error);
