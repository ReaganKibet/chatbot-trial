// ================================
// simple-test.js - Simple Webhook Test (Auto-detects ngrok URL)
// ================================
const axios = require('axios');
require('dotenv').config();

// In your test files, add these headers:
const headers = {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'TestScript/1.0'
};

// And disable SSL verification:
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

async function getNgrokUrl() {
  try {
    const ngrokAPI = await axios.get('http://127.0.0.1:4040/api/tunnels', {
      timeout: 5000
    });
    
    const httpsTunnel = ngrokAPI.data.tunnels.find(t => t.proto === 'https');
    if (httpsTunnel) {
      return httpsTunnel.public_url;
    }
    
    console.log('⚠️  No HTTPS tunnel found, using fallback URL');
    return 'https://1e4511561ed6.ngrok-free.app'; // Current fallback
    
  } catch (error) {
    console.log('⚠️  Could not auto-detect ngrok URL, using fallback');
    return 'https://1e4511561ed6.ngrok-free.app'; // Current fallback
  }
}

async function simpleTest() {
  console.log('🧪 Simple Webhook Test\n');
  
  // Auto-detect ngrok URL
  const ngrokUrl = await getNgrokUrl();
  console.log('🔍 Detected ngrok URL:', ngrokUrl);
  
  // Test 1: Check if your server is running locally
  console.log('\n1️⃣ Checking local server...');
  try {
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Local server running:', response.data.status || response.data);
  } catch (error) {
    console.error('❌ Local server not running. Please start with: node server.js');
    return;
  }
  
  // Test 2: Test webhook locally (this simulates what Twilio does)
  console.log('\n2️⃣ Testing webhook simulation locally...');
  try {
    const webhookData = new URLSearchParams({
      'Body': 'hello',
      'From': 'whatsapp:+254724577131',
      'To': process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      'MessageSid': 'SM_test_' + Date.now()
    });
    
    const response = await axios.post('http://localhost:3000/webhook', webhookData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ Webhook simulation successful!');
    console.log('📱 Response status:', response.status);
    if (response.status === 200) {
      console.log('🤖 Bot should have processed the "hello" message locally');
    }
    
  } catch (error) {
    console.error('❌ Webhook simulation failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      if (error.response.status === 401) {
        console.log('💡 401 Unauthorized is expected - your webhook security is working!');
      }
    }
  }
  
  // Test 3: Send actual Twilio message
  console.log('\n3️⃣ Sending test message via Twilio...');
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const message = await client.messages.create({
      body: '🎯 Final test! Reply "hello" to test automatic responses.',
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to: 'whatsapp:+254724577131'
    });
    
    console.log('✅ Test message sent!');
    console.log('📱 Message SID:', message.sid);
    console.log('📞 From:', message.from);
    console.log('📲 To:', message.to);
    
  } catch (error) {
    console.error('❌ Twilio message failed:', error.message);
    if (error.code) {
      console.log('🔢 Error code:', error.code);
      if (error.code === 20003) {
        console.log('💡 Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
      }
      if (error.code === 21608) {
        console.log('💡 Your phone number may not be verified in Twilio sandbox');
      }
    }
  }
  
  console.log('\n📋 Configuration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Auto-detected ngrok URL:', ngrokUrl);
  console.log('🔗 Webhook URL for Twilio:', `${ngrokUrl}/webhook`);
  console.log('📱 WhatsApp sandbox:', process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886');
  console.log('📞 Your number:', '+254724577131');
  console.log('🏠 Local server:', 'http://localhost:3000');
  
  console.log('\n⚙️ CRITICAL: Update Twilio Console!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
  console.log('2. Navigate: Messaging → Settings → WhatsApp Sandbox');
  console.log(`3. Set webhook URL: ${ngrokUrl}/webhook`);
  console.log('4. Method: POST');
  console.log('5. Save configuration');
  
  console.log('\n🧪 Test Automatic Responses:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Send these to +1 415 523 8886:');
  console.log('• "hello" → Welcome menu');
  console.log('• "help" → Help options');  
  console.log('• "1" → Business info');
  console.log('• "2" → Services');
  console.log('• "3" → Contact details');
  console.log('• "4" → Working hours');
  console.log('• "5" → Location');
  
  console.log('\n🎯 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. ✅ Update Twilio webhook URL (shown above)');
  console.log('2. 📱 Send "hello" to +1 415 523 8886 via WhatsApp');
  console.log('3. 🔍 Check your server console for webhook logs');
  console.log('4. 🤖 Bot should respond automatically!');
}

simpleTest().catch(console.error);