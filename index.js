import express from 'express';
import cors from 'cors';
import { Zalo } from 'zca-js';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Zalo API
let zaloApi = null;

// Initialize Zalo connection
async function initializeZalo() {
    try {
        // Read cookie from file
        const cookieData = JSON.parse(fs.readFileSync('cookie.json', 'utf-8'));
        // Convert cookie array to string format for zca-js
        const cookieString = cookieData.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        const z_uuid = 'ee2dc7fa-8b3f-4971-b6d3-85e1b5a0dff7-d2ad6785d256851dd366703bdc61aa61';
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';

        if (!z_uuid || !userAgent) {
            throw new Error('Missing z_uuid or userAgent in todo.txt');
        }

        // Create new Zalo instance with login credentials
        const zalo = new Zalo({
            cookie: cookieString,
            imei: z_uuid,
            userAgent: userAgent
        }, {
            selfListen: false, // mặc định false, lắng nghe sự kiện của bản thân
            checkUpdate: true // mặc định true, kiểm tra update
        });

        // Login to get the API instance
        console.log('Logging in to Zalo...');
        zaloApi = await zalo.login();

        // Start listening for events
        if (zaloApi.listener) {
            zaloApi.listener.start();
        }
        console.log('Zalo API initialized and logged in successfully!');

        return true;
    } catch (error) {
        console.error('Failed to initialize Zalo API:', error);
        return false;
    }
}

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        zaloConnected: zaloApi !== null,
        timestamp: new Date().toISOString()
    });
});

// Find user by phone number and send message
app.post('/api/send-message', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;

        // Validate input
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        // Check if Zalo API is initialized
        if (!zaloApi) {
            return res.status(500).json({
                success: false,
                error: 'Zalo API not initialized. Please check server logs.'
            });
        }

        // Use default message if not provided
        const messageToSend = message || 'Hello! This is an automated message from Zalo Tools API.';

        console.log(`Finding user with phone number: ${phoneNumber}`);
        
        // Find user by phone number
        const userInfo = await zaloApi.findUser(phoneNumber);
        
        if (!userInfo || !userInfo.uid) {
            return res.status(404).json({
                success: false,
                error: 'User not found with the provided phone number',
                phoneNumber: phoneNumber
            });
        }

        console.log('User found:', {
            uid: userInfo.uid,
            name: userInfo.display_name || userInfo.zalo_name,
            phone: phoneNumber
        });

        // Send message to the user
        console.log(`Sending message to user: ${userInfo.display_name || userInfo.zalo_name}`);
        const sendResult = await zaloApi.sendMessage(messageToSend, userInfo.uid);

        if (sendResult && sendResult.message) {
            return res.json({
                success: true,
                data: {
                    userInfo: {
                        uid: userInfo.uid,
                        display_name: userInfo.display_name,
                        zalo_name: userInfo.zalo_name,
                        avatar: userInfo.avatar,
                        phoneNumber: phoneNumber
                    },
                    message: {
                        content: messageToSend,
                        messageId: sendResult.message.msgId,
                        sentAt: new Date().toISOString()
                    }
                },
                message: 'Message sent successfully!'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Failed to send message',
                userInfo: {
                    uid: userInfo.uid,
                    display_name: userInfo.display_name,
                    zalo_name: userInfo.zalo_name
                }
            });
        }

    } catch (error) {
        console.error('Error in send-message endpoint:', error);
        
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'User not found with the provided phone number',
                phoneNumber: req.body.phoneNumber
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
});

// Find user by phone number (without sending message)
app.post('/api/find-user', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        if (!zaloApi) {
            return res.status(500).json({
                success: false,
                error: 'Zalo API not initialized'
            });
        }

        console.log(`Finding user with phone number: ${phoneNumber}`);
        const userInfo = await zaloApi.findUser(phoneNumber);

        if (!userInfo || !userInfo.uid) {
            return res.status(404).json({
                success: false,
                error: 'User not found with the provided phone number',
                phoneNumber: phoneNumber
            });
        }

        return res.json({
            success: true,
            data: {
                uid: userInfo.uid,
                display_name: userInfo.display_name,
                zalo_name: userInfo.zalo_name,
                avatar: userInfo.avatar,
                cover: userInfo.cover,
                status: userInfo.status,
                gender: userInfo.gender,
                phoneNumber: phoneNumber
            }
        });

    } catch (error) {
        console.error('Error in find-user endpoint:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
});

// Get account info
app.get('/api/account-info', async (req, res) => {
    try {
        if (!zaloApi) {
            return res.status(500).json({
                success: false,
                error: 'Zalo API not initialized'
            });
        }

        const accountInfo = await zaloApi.fetchAccountInfo();
        return res.json({
            success: true,
            data: accountInfo
        });

    } catch (error) {
        console.error('Error getting account info:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get account info: ' + error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
async function startServer() {
    // Initialize Zalo connection first
    const zaloInitialized = await initializeZalo();
    
    if (!zaloInitialized) {
        console.warn('Warning: Zalo API failed to initialize. Some endpoints may not work.');
    }

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`API Endpoints:`);
        console.log(`  POST /api/send-message - Find user and send message`);
        console.log(`  POST /api/find-user - Find user information`);
        console.log(`  GET /api/account-info - Get current account info`);
    });
}

startServer().catch(console.error);
