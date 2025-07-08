# Zalo Tools API

A Node.js API server that integrates with Zalo using the ZCA-JS library to find users by phone number and send messages.

## Features

- Find Zalo users by phone number
- Send messages to users
- RESTful API endpoints
- Cookie-based authentication with Zalo
- Error handling and logging

## Prerequisites

- Node.js 18+ installed
- Valid Zalo account cookies and credentials
- ZCA-JS library compatibility

## Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure you have the required files:
   - `cookie.json` - Your Zalo cookies
   - `todo.txt` - Contains z_uuid and userAgent

## Configuration

The application reads configuration from:
- `cookie.json` - Zalo authentication cookies
- `todo.txt` - Contains z_uuid and userAgent values

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status and Zalo connection status

### Send Message
- **POST** `/api/send-message`
- Body: `{ "phoneNumber": "0909090909", "message": "Hello!" }`
- Finds user by phone number and sends a message
- Uses default "Hello!" message if not provided

### Find User
- **POST** `/api/find-user`
- Body: `{ "phoneNumber": "0909090909" }`
- Returns user information without sending a message

### Account Info
- **GET** `/api/account-info`
- Returns current account information

## Usage Examples

### 1. Find user and send default message
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "0909090909"}'
```

### 2. Find user and send custom message
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "0909090909", "message": "Hello from API!"}'
```

### 3. Just find user information
```bash
curl -X POST http://localhost:3000/api/find-user \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "0909090909"}'
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "userInfo": {
      "uid": "user_id",
      "display_name": "User Name",
      "zalo_name": "zalo_name",
      "avatar": "avatar_url",
      "phoneNumber": "0909090909"
    },
    "message": {
      "content": "Hello!",
      "messageId": 12345,
      "sentAt": "2025-07-08T10:30:00.000Z"
    }
  },
  "message": "Message sent successfully!"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description"
}
```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Error Handling

The API handles various error scenarios:
- Invalid phone numbers
- Users not found
- Zalo API connection issues
- Message sending failures

## Security Notes

- This uses unofficial Zalo APIs
- Using this may violate Zalo's terms of service
- Use at your own risk
- Keep your cookies and credentials secure

## Dependencies

- `express` - Web framework
- `zca-js` - Zalo client library
- `cors` - CORS middleware
- `dotenv` - Environment variables

## License

MIT
