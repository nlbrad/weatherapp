/**
 * Test script for Telegram Bot setup
 * 
 * Run this to verify your bot token and chat ID are working:
 *   node test-telegram.js
 * 
 * Before running:
 * 1. Set your environment variables (or edit the values below)
 * 2. Make sure you've messaged your bot at least once
 */

const axios = require('axios');

// ============================================
// EDIT THESE VALUES (or set as environment variables)
// ============================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID_HERE';
// ============================================

async function testTelegramBot() {
    console.log('🤖 Testing Telegram Bot Setup\n');
    console.log('================================\n');

    // Check if credentials are set
    if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.log('❌ Error: Please set your TELEGRAM_BOT_TOKEN');
        console.log('   Edit this file or set environment variable');
        process.exit(1);
    }

    if (CHAT_ID === 'YOUR_CHAT_ID_HERE') {
        console.log('❌ Error: Please set your TELEGRAM_CHAT_ID');
        console.log('   Edit this file or set environment variable');
        process.exit(1);
    }

    // Test 1: Verify bot token by getting bot info
    console.log('Test 1: Verifying bot token...');
    try {
        const botInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
        const botResponse = await axios.get(botInfoUrl);
        
        if (botResponse.data.ok) {
            const bot = botResponse.data.result;
            console.log(`✅ Bot verified!`);
            console.log(`   Name: ${bot.first_name}`);
            console.log(`   Username: @${bot.username}`);
            console.log(`   Bot ID: ${bot.id}\n`);
        }
    } catch (error) {
        console.log('❌ Bot token verification failed!');
        console.log(`   Error: ${error.response?.data?.description || error.message}`);
        console.log('   Check your TELEGRAM_BOT_TOKEN is correct\n');
        process.exit(1);
    }

    // Test 2: Send a test message
    console.log('Test 2: Sending test message...');
    try {
        const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const testMessage = 
            `🧪 *Test Message*\n\n` +
            `Your Telegram bot is working correctly! ✅\n\n` +
            `*Setup Info:*\n` +
            `• Chat ID: \`${CHAT_ID}\`\n` +
            `• Time: ${new Date().toLocaleString()}\n\n` +
            `_You can now receive weather alerts here._`;

        const sendResponse = await axios.post(sendUrl, {
            chat_id: CHAT_ID,
            text: testMessage,
            parse_mode: 'Markdown'
        });

        if (sendResponse.data.ok) {
            console.log('✅ Test message sent successfully!');
            console.log('   Check your Telegram app for the message.\n');
        }
    } catch (error) {
        console.log('❌ Failed to send test message!');
        const errDesc = error.response?.data?.description || error.message;
        console.log(`   Error: ${errDesc}`);
        
        if (errDesc.includes('chat not found')) {
            console.log('\n   💡 Tip: Make sure you have:');
            console.log('      1. Started a chat with your bot');
            console.log('      2. Sent at least one message to the bot');
            console.log('      3. Used the correct chat ID');
        }
        process.exit(1);
    }

    // Summary
    console.log('================================');
    console.log('🎉 All tests passed!\n');
    console.log('Next steps:');
    console.log('1. Add these to your backend/local.settings.json:');
    console.log(`   "TELEGRAM_BOT_TOKEN": "${BOT_TOKEN}"`);
    console.log(`   "TELEGRAM_CHAT_ID": "${CHAT_ID}"`);
    console.log('\n2. Copy the function files to your backend/src/functions/');
    console.log('3. Restart your Azure Functions backend');
    console.log('4. Test the /api/telegram/send endpoint');
}

// Run the test
testTelegramBot().catch(console.error);