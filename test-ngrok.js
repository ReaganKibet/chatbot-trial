// ================================
// test-new-ngrok.js - Test New Ngrok URL
// ================================
require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Create axios instance that ignores SSL certificate issues (for ngrok)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  }),
  timeout: 15000
});

async function testNewNgrok() {
  const ngrokUrl = 'https://55688753b6df.ngrok-free.app';
  
  console.log('🧪 Testing New Ngrok URL\n');
  console.log('🌐 Testing URL:', ngrokUrl);
  
  // Test 1: Health check
  try {
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await axiosInstance.get(`${ngrokUrl}/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('💡 Trying without SSL verification...');
    
    try {
      const healthResponse2 = await axiosInstance.get(`${ngrokUrl}/health`);
      console.log('✅ Health check passed (no SSL):', healthResponse2.data);
    } catch (error2) {
      console.error('❌ Health check still failed:', error2.message);
      return;
    }
  }
  
  // Test 2: Webhook endpoint
  try {
    console.log('\n2️⃣ Testing webhook endpoint...');
    const webhookResponse = await axiosInstance.get(`${ngrokUrl}/webhook/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    console.log('✅ Webhook endpoint accessible:', webhookResponse.data);
  } catch (error) {
    console.error('❌ Webhook endpoint failed:', error.message);
  }
  
  // Test 3: Simulate webhook POST
  try {
    console.log('\n3️⃣ Simulating Twilio webhook...');
    const webhookData = new URLSearchParams({
      'Body': 'hello',
      'From': 'whatsapp:+254724577131',
      'To': process.env.TWILIO_WHATSAPP_NUMBER,
      'MessageSid': 'SM_test_' + Date.now(),
      'AccountSid': process.env.TWILIO_ACCOUNT_SID
    });
    
    const response = await axiosInstance.post(`${ngrokUrl}/webhook`, webhookData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TwilioProxy/1.1',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    console.log('✅ Webhook simulation successful!');
    console.log('📱 Status:', response.status);
    console.log('📨 Check your WhatsApp - you should have received an auto-response!');
    
  } catch (error) {
    console.error('❌ Webhook simulation failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  // Test 4: Send actual Twilio message
  try {
    console.log('\n4️⃣ Sending test message via Twilio...');
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const message = await client.messages.create({
      body: '🎯 Testing with new ngrok URL! Reply "hello" to test automatic responses.',
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:+254724577131'
    });
    
    console.log('✅ Test message sent successfully!');
    console.log('📱 Message SID:', message.sid);
    
  } catch (error) {
    console.error('❌ Twilio message failed:', error.message);
  }
  
  console.log('\n🎉 Testing completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. ✅ Update your .env file with: BASE_URL=https://55688753b6df.ngrok-free.app');
  console.log('2. 🔄 Restart your server: npm start');
  console.log('3. ⚙️ Update Twilio Console webhook URL to: https://55688753b6df.ngrok-free.app/webhook');
  console.log('4. 📱 Send "hello" to +14155238886 to test automatic responses');
  console.log('\n💡 Expected bot responses:');
  console.log('   "hello" → Welcome menu');
  console.log('   "help" → Help menu'); 
  console.log('   "1" → Products');
  console.log('   "2" → Appointments');
  console.log('   "3" → Support');
}

testNewNgrok().catch(console.error);