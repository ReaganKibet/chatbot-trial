// ================================
// ngrok-diagnostic.js - Check ngrok tunnel status (SMART VERSION)
// ================================
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function checkNgrokStatus() {
    console.log('🔍 Ngrok Tunnel Diagnostic\n');
    
    try {
        // Check ngrok local API (this shows active tunnels)
        console.log('1️⃣ Checking ngrok local API...');
        const ngrokAPI = await axios.get('http://127.0.0.1:4040/api/tunnels', {
            timeout: 5000
        });
        
        console.log('✅ Ngrok is running!');
        console.log('📊 Active tunnels:', ngrokAPI.data.tunnels.length);
        
        if (ngrokAPI.data.tunnels.length === 0) {
            console.log('❌ No active tunnels found!');
            console.log('💡 You need to start ngrok: ngrok http 3000');
            return;
        }
        
        // Show tunnel details
        ngrokAPI.data.tunnels.forEach((tunnel, index) => {
            console.log(`\n🌐 Tunnel ${index + 1}:`);
            console.log('   🔗 Public URL:', tunnel.public_url);
            console.log('   🏠 Local URL:', tunnel.config.addr);
            console.log('   📝 Protocol:', tunnel.proto);
            console.log('   📊 Status:', tunnel.metrics ? 'Active' : 'Unknown');
        });
        
        // Get the HTTPS tunnel URL (Twilio needs HTTPS)
        const httpsTunnel = ngrokAPI.data.tunnels.find(t => t.proto === 'https');
        if (!httpsTunnel) {
            console.log('\n❌ No HTTPS tunnel found!');
            console.log('💡 Twilio requires HTTPS webhooks');
            return;
        }
        
        const actualNgrokUrl = httpsTunnel.public_url;
        console.log('\n🎯 Correct ngrok URL:', actualNgrokUrl);
        
        // Test the actual ngrok URL
        console.log('\n2️⃣ Testing the actual ngrok URL...');
        try {
            const response = await axios.get(`${actualNgrokUrl}/health`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'DiagnosticScript/1.0'
                },
                timeout: 10000
            });
            
            console.log('✅ Ngrok tunnel is working!');
            console.log('📊 Health check response:', response.data.status);
            
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('⚠️  403 Forbidden - ngrok browser warning (expected)');
                console.log('💡 Twilio can still access this URL');
            } else {
                console.log('❌ Ngrok test failed:', error.message);
                console.log('🔍 This might indicate a tunnel issue');
            }
        }
        
        // SMART URL MISMATCH DETECTION
        console.log('\n3️⃣ Checking for URL mismatches in project files...');
        
        const filesToCheck = [
            'webhook-debug.js',
            'quick-test.js',
            '.env'
        ];
        
        let mismatches = [];
        
        for (const filename of filesToCheck) {
            const filePath = path.join(__dirname, filename);
            
            if (fs.existsSync(filePath)) {
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    
                    // Look for ngrok URLs in the file
                    const ngrokUrlPattern = /https:\/\/[a-z0-9]+\.ngrok-free\.app/g;
                    const foundUrls = fileContent.match(ngrokUrlPattern) || [];
                    
                    if (foundUrls.length > 0) {
                        const uniqueUrls = [...new Set(foundUrls)];
                        uniqueUrls.forEach(foundUrl => {
                            if (foundUrl !== actualNgrokUrl) {
                                mismatches.push({
                                    file: filename,
                                    foundUrl: foundUrl,
                                    shouldBe: actualNgrokUrl
                                });
                            }
                        });
                        
                        console.log(`📁 ${filename}: Found ${uniqueUrls.length} ngrok URL(s)`);
                        uniqueUrls.forEach(url => {
                            const status = url === actualNgrokUrl ? '✅' : '❌';
                            console.log(`   ${status} ${url}`);
                        });
                    } else {
                        console.log(`📁 ${filename}: No ngrok URLs found`);
                    }
                } catch (error) {
                    console.log(`❌ Error reading ${filename}:`, error.message);
                }
            } else {
                console.log(`📁 ${filename}: File not found (optional)`);
            }
        }
        
        // Show configuration summary
        console.log('\n📋 Configuration Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Ngrok is running:', 'YES');
        console.log('🔗 Correct ngrok URL:', actualNgrokUrl);
        console.log('🎯 Webhook URL for Twilio:', `${actualNgrokUrl}/webhook`);
        console.log('🏠 Local server:', 'http://localhost:3000');
        
        if (mismatches.length > 0) {
            console.log('\n⚠️  URL MISMATCHES DETECTED!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            mismatches.forEach(mismatch => {
                console.log(`❌ File: ${mismatch.file}`);
                console.log(`   Found: ${mismatch.foundUrl}`);
                console.log(`   Should be: ${mismatch.shouldBe}`);
                console.log();
            });
            
            console.log('💡 FIXES REQUIRED:');
            const uniqueFiles = [...new Set(mismatches.map(m => m.file))];
            uniqueFiles.forEach(file => {
                const fileMismatches = mismatches.filter(m => m.file === file);
                console.log(`📝 Update ${file}:`);
                fileMismatches.forEach(mismatch => {
                    if (file === '.env') {
                        console.log(`   Change: BASE_URL=${mismatch.foundUrl}`);
                        console.log(`   To:     BASE_URL=${mismatch.shouldBe}`);
                    } else {
                        console.log(`   Change: const ngrokUrl = '${mismatch.foundUrl}';`);
                        console.log(`   To:     const ngrokUrl = '${mismatch.shouldBe}';`);
                    }
                });
                console.log();
            });
            
        } else {
            console.log('\n✅ NO URL MISMATCHES - All files are using the correct ngrok URL!');
        }
        
        // Twilio configuration reminder
        console.log('\n🔧 Don\'t forget to update Twilio Console:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 URL: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
        console.log(`🔗 Webhook URL: ${actualNgrokUrl}/webhook`);
        console.log('📝 Method: POST');
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Ngrok is not running!');
            console.log('💡 Start ngrok with: ngrok http 3000');
            console.log('📍 Then run this script again to get the correct URL');
        } else {
            console.log('❌ Error checking ngrok:', error.message);
        }
    }
}

checkNgrokStatus().catch(console.error);