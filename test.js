import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🚀 Testing Zalo Tools API...\n');

    // Test 1: Health check
    console.log('1. Testing health check...');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Health check:', data);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }

    // Test 2: Find user
    console.log('\n2. Testing find user...');
    const testPhone = '0859852091'; // Replace with a real phone number for testing
    try {
        const response = await fetch(`${BASE_URL}/api/find-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: testPhone })
        });
        const data = await response.json();
        console.log('✅ Find user result:', data);
    } catch (error) {
        console.log('❌ Find user failed:', error.message);
    }

    // Test 3: Send message
    console.log('\n3. Testing send message...');
    try {
        const response = await fetch(`${BASE_URL}/api/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phoneNumber: testPhone,
                message: 'Hello from Zalo Tools API test!' 
            })
        });
        const data = await response.json();
        console.log('✅ Send message result:', data);
    } catch (error) {
        console.log('❌ Send message failed:', error.message);
    }

    // Test 4: Account info
    console.log('\n4. Testing account info...');
    try {
        const response = await fetch(`${BASE_URL}/api/account-info`);
        const data = await response.json();
        console.log('✅ Account info:', data);
    } catch (error) {
        console.log('❌ Account info failed:', error.message);
    }
}

// Run tests
testAPI().catch(console.error);
