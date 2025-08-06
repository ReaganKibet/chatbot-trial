// ================================
// quick-test-fixed.js - Updated for your actual server
// ================================

const axios = require('axios');
const twilio = require('twilio');
require('dotenv').config();

async function quickTest() {
    console.log('🧪 Quick Setup Test for WhatsApp Chatbot\n');
    
    const ngrokUrl = 'https://1e4511561ed6.ngrok-free.app';
    const localUrl = 'http://localhost:3000';
    
    // Test 1: Server health check (using /health endpoint)
    console.log('1️⃣ Testing server health...');
    try {
      const response = await axios.get(`${localUrl}/health`, { timeout: 5000 });
      console.log('✅ Server is running!');
      console.log('   📊 Status:', response.data.status);
      console.log('   ⏰ Uptime:', Math.floor(response.data.uptime), 'seconds');
      console.log('   🌍 Environment:', response.data.environment);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      console.log('💡 Make sure to run: node server.js');
      return; // Exit early if server is not running
    }
    
    // Test 2: Test webhook endpoint (development only)
    console.log('\n2️⃣ Testing webhook endpoint...');
    try {
      const response = await axios.get(`${localUrl}/test-webhook`, { timeout: 5000 });
      console.log('✅ Webhook test endpoint accessible!');
      console.log('   🔗 Webhook URL:', response.data.webhookUrl);
    } catch (error) {
      console.log('❌ Test webhook endpoint failed:', error.message);
      if (error.response?.status === 404) {
        console.log('💡 This might be because NODE_ENV is not set to "development"');
      }
    }
    
    // Test 3: Check if webhook endpoint responds to GET requests
    console.log('\n3️⃣ Checking webhook endpoint directly...');
    try {
      const response = await axios.get(`${localUrl}/webhook`, { 
        timeout: 5000,
        validateStatus: function (status) {
          // Accept any status code (including 404, 405) as long as server responds
          return status < 500;
        }
      });
      console.log('✅ Webhook endpoint is accessible');
      console.log('   📋 Response status:', response.status);
      if (response.status === 405) {
        console.log('   💡 Method Not Allowed - This is expected! Twilio will POST to this endpoint.');
      }
    } catch (error) {
      console.log('❌ Webhook endpoint not accessible:', error.message);
    }
    
    // Test 4: Check environment variables
    console.log('\n4️⃣ Checking environment configuration...');
    const requiredEnvVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'BASE_URL'
    ];
    
    let envOk = true;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: Set (${envVar === 'BASE_URL' ? process.env[envVar] : '***hidden***'})`);
      } else {
        console.log(`❌ ${envVar}: Not set`);
        envOk = false;
      }
    }
    
    if (!envOk) {
      console.log('\n⚠️  Some environment variables are missing!');
      console.log('💡 Make sure your .env file contains all required variables.');
      return;
    }
    
    // Test 5: Send test message via Twilio
    console.log('\n5️⃣ Testing Twilio message sending...');
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const message = await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+254724577131',
        body: '🧪 Test message from your WhatsApp Chatbot!\n\nReply with any message to test the webhook integration!'
      });
      
      console.log('✅ Test message sent successfully!');
      console.log('   📱 Message SID:', message.sid);
      console.log('   📞 From:', message.from);
      console.log('   📲 To:', message.to);
      console.log('\n📨 Check your WhatsApp and reply to test the bot!');
      
    } catch (error) {
      console.log('❌ Twilio message failed:', error.message);
      if (error.code) {
        console.log('   🔢 Error code:', error.code);
      }
      if (error.message.includes('authentication') || error.code === 20003) {
        console.log('💡 Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env file');
      }
      if (error.code === 21608) {
        console.log('💡 Your phone number may not be verified in the Twilio sandbox');
      }
    }
    
    console.log('\n🎉 Setup test completed!');
    console.log('\n📋 Next Steps:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. ✅ Check your WhatsApp for the test message');
    console.log('2. 💬 Reply with any message to test webhook integration');
    console.log('3. 📊 Monitor your server console for incoming webhooks');
    console.log('4. 🔧 Configure Twilio webhook URL if not done already');
    
    console.log('\n⚙️ Twilio Console Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Twilio Console: https://console.twilio.com');
    console.log('📍 Navigate to: Messaging → Settings → WhatsApp Sandbox');
    console.log('🔗 Webhook URL:', `${ngrokUrl}/webhook`);
    console.log('📝 HTTP Method: POST');
    console.log('📱 Sandbox Number: +1 415 523 8886');
    console.log('📞 Your Number: +254724577131');
    
    console.log('\n🔧 Current Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Ngrok URL:', ngrokUrl);
    console.log('🏠 Local Server:', localUrl);
    console.log('🎯 Webhook Endpoint:', `${ngrokUrl}/webhook`);
    console.log('🔗 Base URL (from env):', process.env.BASE_URL || 'Not set');
}

// Fixed function call
quickTest().catch(console.error);