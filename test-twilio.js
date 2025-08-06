// ================================
// test-twilio.js - Test Twilio WhatsApp Integration
// ================================
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Test function to send a WhatsApp message
async function testWhatsAppMessage() {
  try {
    console.log('🔍 Testing Twilio WhatsApp integration...');
    console.log('📱 From:', process.env.TWILIO_WHATSAPP_NUMBER);
    console.log('📱 To: whatsapp:+254724577131');

    // Test 1: Simple text message
    const message1 = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      body: '🤖 Hello! This is a test message from your WhatsApp chatbot. The integration is working!',
      to: 'whatsapp:+254724577131'
    });

    console.log('✅ Simple message sent successfully!');
    console.log('📧 Message SID:', message1.sid);
    console.log('📊 Status:', message1.status);

    // Test 2: Template message (like your original code)
    const message2 = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
      contentVariables: JSON.stringify({"1":"12/1","2":"3pm"}),
      to: 'whatsapp:+254724577131'
    });

    console.log('✅ Template message sent successfully!');
    console.log('📧 Message SID:', message2.sid);
    console.log('📊 Status:', message2.status);

    // Test 3: Interactive message with buttons
    const message3 = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      body: '🎯 Quick Test Menu:\n\n1️⃣ View Products\n2️⃣ Book Appointment\n3️⃣ Get Support\n\nReply with a number to test the chatbot!',
      to: 'whatsapp:+254724577131'
    });

    console.log('✅ Interactive message sent successfully!');
    console.log('📧 Message SID:', message3.sid);

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Test function to check account info
async function testAccountInfo() {
  try {
    console.log('\n🔍 Checking Twilio account information...');
    
    const account = await client.api.accounts(accountSid).fetch();
    console.log('✅ Account Status:', account.status);
    console.log('📊 Account Type:', account.type);
    
    // Check WhatsApp sender
    const phoneNumbers = await client.incomingPhoneNumbers.list({limit: 20});
    console.log('📱 Available phone numbers:', phoneNumbers.length);
    
  } catch (error) {
    console.error('❌ Error checking account:', error.message);
  }
}

// Test function to check message status
async function checkMessageStatus(messageSid) {
  try {
    const message = await client.messages(messageSid).fetch();
    console.log(`📧 Message ${messageSid}:`);
    console.log('📊 Status:', message.status);
    console.log('💰 Price:', message.price);
    console.log('📅 Date:', message.dateCreated);
  } catch (error) {
    console.error('❌ Error checking message status:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Twilio WhatsApp Tests...\n');
  
  // Test 1: Account info
  await testAccountInfo();
  
  // Test 2: Send messages
  await testWhatsAppMessage();
  
  console.log('\n✅ All tests completed!');
  console.log('📱 Check your WhatsApp for the test messages.');
}

// Run the tests
runTests().catch(console.error);