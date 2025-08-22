import express from 'express';
import cors from 'cors';
import { Zalo } from 'zca-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Import cookie data
import cookieData from './cookieData.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Zalo API
let zaloApi = null;

// Ensure upload directory exists
function ensureUploadDirectory() {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created uploads directory');
    }
    return uploadDir;
}

// Remove auto-print functionality from PDF buffer
function removeAutoPrintFromPDF(buffer) {
    try {
        let pdfContent = buffer.toString('binary');

        // Common auto-print JavaScript patterns to remove
        const autoPrintPatterns = [
            /this\.print\(\s*\)/gi,                    // this.print()
            /window\.print\(\s*\)/gi,                  // window.print()
            /print\(\s*\)/gi,                          // print()
            /\/S\s*\/JavaScript\s*\/JS\s*\(print\(\)\)/gi, // PDF action dictionary
            /\/OpenAction\s*<<[^>]*\/S\s*\/JavaScript[^>]*print\(\)[^>]*>>/gi, // OpenAction with print
            /\/AA\s*<<[^>]*\/O\s*<<[^>]*\/S\s*\/JavaScript[^>]*print\(\)[^>]*>>[^>]*>>/gi, // Additional Actions
            /\/Names\s*<<[^>]*\/JavaScript[^>]*print\(\)[^>]*>>/gi, // Named JavaScript actions
            /\/Catalog\s*<<[^>]*\/OpenAction[^>]*print\(\)[^>]*>>/gi, // Catalog OpenAction
        ];

        // Remove auto-print patterns
        let originalLength = pdfContent.length;
        autoPrintPatterns.forEach(pattern => {
            pdfContent = pdfContent.replace(pattern, '');
        });

        // Remove OpenAction references that might trigger auto-print
        pdfContent = pdfContent.replace(/\/OpenAction\s+\d+\s+\d+\s+R/gi, '');

        // Remove any remaining JavaScript actions that contain 'print'
        pdfContent = pdfContent.replace(/\/JS\s*\([^)]*print[^)]*\)/gi, '/JS ()');

        if (pdfContent.length !== originalLength) {
            console.log('Auto-print functionality detected and removed from PDF');
        } else {
            console.log('No auto-print functionality detected in PDF');
        }

        return Buffer.from(pdfContent, 'binary');
    } catch (error) {
        console.warn('Failed to remove auto-print from PDF, using original:', error.message);
        return buffer; // Return original buffer if processing fails
    }
}

// Download PDF file from URL and remove auto-print functionality
async function downloadPDF(url, filename) {
    try {
        console.log(`Downloading PDF from: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('pdf')) {
            console.warn(`Warning: Content type is ${contentType}, expected PDF`);
        }

        let buffer = await response.buffer();

        // Remove auto-print functionality from PDF
        buffer = removeAutoPrintFromPDF(buffer);

        const uploadDir = ensureUploadDirectory();
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, buffer);
        console.log(`PDF downloaded successfully to: ${filePath}`);

        return filePath;
    } catch (error) {
        console.error('Error downloading PDF:', error);
        throw error;
    }
}

// Clean up file after use
function cleanupFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up file: ${filePath}`);
        }
    } catch (error) {
        console.error('Error cleaning up file:', error);
    }
}

// Initialize Zalo connection
async function initializeZalo() {
    try {
        const z_uuid = process.env.Z_UUID;
        const userAgent = process.env.USER_AGENT;
        if (!z_uuid || !userAgent) {
            throw new Error('Missing Z_UUID or USER_AGENT in environment variables');
        }

        // Create new Zalo instance with options
        const zalo = new Zalo({
            selfListen: false, // mặc định false, lắng nghe sự kiện của bản thân
            checkUpdate: true, // mặc định true, kiểm tra update
            polyfill: fetch // ensure fetch is available for update check
        });

        // Login to get the API instance
        console.log('Logging in to Zalo...');
        zaloApi = await zalo.login({
            cookie: cookieData, // pass cookie array directly per zca-js API
            imei: z_uuid,
            userAgent: userAgent,
            language: 'vi'
        });

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
    let downloadedFilePath = null;
    try {
        const { phoneNumber, message, urlResult } = req.body;

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
        // Find user by phone number
        const userInfo = await zaloApi.findUser(phoneNumber);

        if (!userInfo || !userInfo.uid) {
            return res.status(404).json({
                success: false,
                error: `Không tìm thấy người dùng với số điện thoại ${phoneNumber}`,
                phoneNumber: phoneNumber
            });
        }

        let sendResult;
        // Handle PDF download and attachment if urlResult is provided
        if (urlResult) {
            try {
                const lisUrl = process.env.LIS_URL;
                if (!lisUrl) {
                    throw new Error('LIS_URL environment variable is required for PDF download');
                }

                // Combine lisUrl with urlResult to create the full PDF download URL
                const fullPdfUrl = lisUrl + urlResult;
                // Generate unique filename for the PDF
                const filename = `ket_qua_${Date.now()}.pdf`;
                // Download the PDF file
                downloadedFilePath = await downloadPDF(fullPdfUrl, filename);

                // Send message with file attachment
                console.log(`Sending message with PDF attachment to user: ${userInfo.display_name || userInfo.zalo_name}`);
                sendResult = await zaloApi.sendMessage({
                    msg: messageToSend,
                    attachments: [downloadedFilePath]
                }, userInfo.uid);

            } catch (pdfError) {
                console.error('Error processing PDF:', pdfError);
                return res.status(500).json({
                    success: false,
                    error: 'Không thể tải xuống hoặc xử lý tệp PDF: ' + pdfError.message,
                });
            }
        } else {
            // Send regular text message
            console.log(`Sending text message to user: ${userInfo.display_name || userInfo.zalo_name}`);
            sendResult = await zaloApi.sendMessage(messageToSend, userInfo.uid);
        }

        // Clean up downloaded file if it exists
        if (downloadedFilePath) {
            cleanupFile(downloadedFilePath);
        }

        if (sendResult && sendResult.message) {
            return res.json({
                success: true,
                message: urlResult ? 'Gửi kết quả thành công!' : 'Gửi tin nhắn thành công!'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Không gửi được kết quả',
            });
        }

    } catch (error) {
        console.error('Error in send-message endpoint:', error);
        // Clean up downloaded file if it exists and there was an error
        if (downloadedFilePath) {
            cleanupFile(downloadedFilePath);
        }

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
        console.log(`  POST /api/send-message - Find user and send message (with optional PDF attachment)`);
        console.log(`  POST /api/find-user - Find user information`);
        console.log(`  GET /api/account-info - Get current account info`);
        console.log(`\nNote: Send message endpoint supports PDF attachments via urlResult parameter`);
    });
}

startServer().catch(console.error);
