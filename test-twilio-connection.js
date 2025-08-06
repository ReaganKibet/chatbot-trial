// ================================
// test-twilio-connection.js
// ================================
require('dotenv').config();

async function testTwilioConnection() {
    console.log('🧪 Testing Twilio WhatsApp Service\n');
    
    try {
        // Check environment variables first
        console.log('🔍 Checking environment variables...');
        
        if (!process.env.TWILIO_ACCOUNT_SID) {
            console.log('❌ TWILIO_ACCOUNT_SID not found in .env file');
            return;
        }
        
        if (!process.env.TWILIO_AUTH_TOKEN) {
            console.log('❌ TWILIO_AUTH_TOKEN not found in .env file');
            return;
        }
        
        console.log('✅ Environment variables found');
        console.log(`📱 Account SID: ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
        console.log(`🔑 Auth Token: ${process.env.TWILIO_AUTH_TOKEN.substring(0, 10)}...`);
        
        // Import your service
        console.log('\n📦 Loading WhatsApp service...');
        const WhatsAppServiceClass = require('./src/services/whatsappService');
const whatsappService = new WhatsAppServiceClass();
        console.log('✅ WhatsApp service loaded successfully');
        
        // Test 1: Connection test
        console.log('\n1️⃣ Testing Twilio connection...');
        const connectionOk = await whatsappService.testConnection();
        
        if (!connectionOk) {
            console.log('❌ Connection test failed - check your credentials');
            return;
        }
        
        // Test 2: Simple text message
        console.log('\n2️⃣ Testing simple text message...');
        const testMessage = '🧪 Connection test successful! Your Twilio WhatsApp service is working perfectly. ✅\n\nTimestamp: ' + new Date().toLocaleString();
        
        const message = await whatsappService.sendTextMessage(
            '+254724577131', // Your phone number (will be auto-prefixed with whatsapp:)
            testMessage
        );
        
        console.log('✅ Test message sent successfully!');
        console.log('📱 Check your WhatsApp for the test message');
        console.log(`📊 Message SID: ${message.sid}`);
        console.log(`📊 Status: ${message.status}`);
        
        // Test 3: sendMessage method with different formats
        console.log('\n3️⃣ Testing sendMessage method with object...');
        const objectMessage = {
            type: 'text',
            text: {
                body: '🔧 Testing object-based message format! This confirms your service can handle different message types.'
            }
        };
        
        const message2 = await whatsappService.sendMessage('+254724577131', objectMessage);
        console.log('✅ Object message sent successfully!');
        console.log(`📊 Message SID: ${message2.sid}`);
        
        // Test 4: Interactive buttons simulation
        console.log('\n4️⃣ Testing interactive buttons (Twilio simulation)...');
        const buttonsMessage = await whatsappService.sendInteractiveButtons(
            '+254724577131',
            'Test complete! Choose what you\'d like to test next:',
            [
                { title: 'Send Image Test' },
                { title: 'Send Document Test' },
                { title: 'Send List Test' }
            ],
            'Service Test Results'
        );
        
        console.log('✅ Interactive buttons sent successfully!');
        console.log(`📊 Message SID: ${buttonsMessage.sid}`);
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('📱 Check your WhatsApp for all test messages');
        console.log('\n💡 Your Twilio WhatsApp service is fully functional and ready to use!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('🔍 Full error:', error);
        
        // Provide specific help based on error type
        if (error.message.includes('authentication') || error.code === 20003) {
            console.log('\n💡 Authentication Error Solutions:');
            console.log('   → Double-check TWILIO_ACCOUNT_SID in .env file');
            console.log('   → Double-check TWILIO_AUTH_TOKEN in .env file');
            console.log('   → Verify credentials at https://console.twilio.com');
            console.log('   → Remove any quotes around values in .env file');
        }
        
        if (error.code === 21608) {
            console.log('\n💡 Phone Number Not Verified Error:');
            console.log('   → Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
            console.log('   → Find your sandbox keyword (e.g. "join house-brave")');
            console.log('   → Send that message to +1 415 523 8886 via WhatsApp');
            console.log('   → Wait for confirmation: "Sandbox: ✅ You are all set!"');
            console.log('   → Then run this test again');
        }
        
        if (error.code === 21614) {
            console.log('\n💡 Invalid Phone Number Format:');
            console.log('   → Make sure phone number includes country code: +254724577131');
            console.log('   → Format should be: +[country code][phone number]');
        }
        
        if (error.message.includes('Network')) {
            console.log('\n💡 Network Error:');
            console.log('   → Check your internet connection');
            console.log('   → Try again in a few moments');
        }
        
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
            console.log('\n💡 File Not Found:');
            console.log('   → Make sure src/services/whatsappService.js exists');
            console.log('   → Check that the file path is correct');
        }
    }
}

// Add some helpful startup info
console.log('🚀 Twilio WhatsApp Connection Test');
console.log('===================================');
console.log('📁 Current directory:', process.cwd());
console.log('🌍 Node.js version:', process.version);
console.log('');

// Run the test
testTwilioConnection();