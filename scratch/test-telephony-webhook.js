const http = require('http');

async function testWebhook() {
  const payload = JSON.stringify({
    CallSid: 'exotel_call_test_' + Date.now(),
    From: '+919839012005', // Deepak Yadav / Agent
    To: '+919918233445',   // Client
    DialCallDuration: '145',
    Status: 'completed',
    RecordingUrl: 'https://cdn.diksharealestate.com/recordings/sample-call-lucknow-site.mp3',
    notes: 'Exotel cloud automated call recording and verification test',
    Direction: 'outbound'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhooks/telephony',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('Webhook Response Code:', res.statusCode);
      console.log('Response Body:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(payload);
  req.end();
}

testWebhook();
