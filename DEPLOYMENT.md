# Zalo Tools API - Deployment Guide

This guide explains how to deploy the Zalo Tools API using Docker with externalized environment configuration.

## Overview

The application now uses externalized environment configuration, meaning:

- The `.env` file is **NOT** included in the Docker image
- Environment variables are created on the server at deployment time
- Configuration is managed through `docker-compose.yml` and a local `.env` file

## Prerequisites

- Docker and Docker Compose installed on the server
- Access to the Docker registry: `registry.iolis.solutions/iolis-mednova/landingpage:1.0`

## Deployment Steps

### 1. Create Deployment Directory

On your server, create a directory for the Zalo Tools deployment:

```bash
mkdir -p /path/to/zalotool
cd /path/to/zalotool
```

### 2. Copy Required Files

Copy the following files to your deployment directory:

- `docker-compose.yml`
- `create-env.sh` (Linux/macOS) or `create-env.bat` (Windows)
- `cookies.json.template` (optional, for reference)

### 3. Create Environment Configuration

#### On Linux/macOS:

```bash
chmod +x create-env.sh
./create-env.sh
```

#### On Windows:

```cmd
create-env.bat
```

The script will prompt you for the following required values:

- **Z_UUID**: Device UUID for Zalo API authentication
- **USER_AGENT**: User agent string for Zalo API requests
- **LIS_URL**: Base URL for LIS server PDF downloads

Optional values (with defaults):

- **PORT**: Application port (default: 3001)
- **NODE_ENV**: Node environment (default: production)

### 4. Start the Container

```bash
docker-compose up -d
```

### 5. Verify Deployment

Check if the container is running:

```bash
docker-compose ps
```

Check application health:

```bash
curl http://localhost:3001/health
```

View logs:

```bash
docker-compose logs -f
```

## Configuration Reference

### Required Environment Variables

| Variable     | Description                             | Example                                        |
| ------------ | --------------------------------------- | ---------------------------------------------- |
| `Z_UUID`     | Zalo device UUID for API authentication | `550e8400-e29b-41d4-a716-446655440000`         |
| `USER_AGENT` | User agent string for Zalo API requests | `Mozilla/5.0 (Windows NT 10.0; Win64; x64)...` |
| `LIS_URL`    | Base URL for LIS server PDF downloads   | `https://lis.yourserver.com/api/reports/`      |

### Optional Environment Variables

| Variable   | Description                | Default      |
| ---------- | -------------------------- | ------------ |
| `PORT`     | Application listening port | `3001`       |
| `NODE_ENV` | Node.js environment        | `production` |

## Docker Compose Configuration

The `docker-compose.yml` file is configured to:

- Use environment variables from the local `.env` file
- Provide default values for optional variables
- Mount a persistent volume for uploads
- Include health checks
- Auto-restart the container

## Cookie Configuration

The application now supports **externalized cookie configuration**, meaning you can update Zalo authentication cookies without rebuilding the Docker image.

### Cookie Management Options

The application will load cookies in the following priority order:

1. **External Configuration**: `config/cookies.json` (mounted as volume)
2. **Built-in Fallback**: `cookieData.js` (embedded in image)

### Setting Up Cookies

#### Option 1: Using the Setup Script

The setup script (`create-env.sh` or `create-env.bat`) will prompt you to configure cookies during initial setup.

#### Option 2: Manual Configuration

1. Create a `config` directory in your deployment folder
2. Create `config/cookies.json` with your cookie data
3. Use the provided template as a reference

#### Required Cookie Values

You need to extract these cookies from your browser when logged into Zalo:

- `zpw_sek` - Zalo session token
- `__zi` - Zalo identifier
- `zpsid` - Zalo session ID

### Updating Cookies

To update cookies without rebuilding:

1. Edit `config/cookies.json` with new cookie values
2. Restart the container: `docker-compose restart`
3. Monitor logs to ensure successful authentication

## Updating the Application

### Update Container Image

```bash
docker-compose pull
docker-compose up -d
```

### Update Environment Variables

1. Edit the `.env` file directly, or
2. Run the setup script again: `./create-env.sh` (Linux/macOS) or `create-env.bat` (Windows)
3. Restart the container: `docker-compose restart`

### Update Cookies

1. Edit `config/cookies.json` with new cookie values, or
2. Run the setup script again to reconfigure cookies
3. Restart the container: `docker-compose restart`

## Troubleshooting

### Container Won't Start

- Check if all required environment variables are set: `cat .env`
- Verify the `.env` file format (no quotes around values unless needed)
- Check Docker logs: `docker-compose logs`

### Zalo API Connection Issues

- Verify `Z_UUID` and `USER_AGENT` values
- Check if `config/cookies.json` contains valid authentication cookies
- Ensure cookie values are not expired
- Monitor application logs for authentication errors
- Try refreshing cookies from a logged-in browser session

### Health Check Failures

- Ensure the application is binding to the correct port
- Check if the port is accessible from within the container
- Verify firewall settings if accessing from external hosts

## Security Notes

- Keep the `.env` file secure and don't commit it to version control
- Keep `config/cookies.json` secure and don't commit it to version control
- Regularly update the authentication cookies when they expire
- Monitor application logs for security-related issues
- Use proper network security (firewalls, VPNs) to protect the API endpoints
- Zalo cookies typically expire after some time - monitor for authentication failures

## File Structure

After deployment, your directory should look like:

```
zalotool/
├── docker-compose.yml
├── .env                          # Created by setup script
├── create-env.sh                # Setup script (Linux/macOS)
├── create-env.bat               # Setup script (Windows)
├── cookies.json.template        # Cookie template reference (optional)
└── config/
    └── cookies.json             # Cookie configuration (created by setup script)
```

## Cookie Management Guide

### Extracting Cookies from Browser

1. **Login to Zalo Web** in your browser
2. **Open Developer Tools** (F12)
3. **Go to Application/Storage tab**
4. **Find Cookies** under the Zalo domain
5. **Extract the following values**:
   - `zpw_sek` from `.chat.zalo.me`
   - `__zi` from `.zalo.me`
   - `zpsid` from `.zalo.me`

### Cookie File Format

The `config/cookies.json` file should contain an array of cookie objects:

```json
[
  {
    "domain": ".chat.zalo.me",
    "name": "zpw_sek",
    "value": "your_zpw_sek_value_here",
    "httpOnly": true,
    "secure": true
  }
  // ... other cookie objects
]
```

### Automated Cookie Updates

For production environments, you may want to implement automated cookie refresh:

1. Create a monitoring script that checks authentication status
2. Set up alerts when cookies are about to expire
3. Use browser automation tools to refresh cookies programmatically
4. Update the `config/cookies.json` file and restart the container

### Troubleshooting Cookie Issues

- **Authentication Failures**: Check if cookies are expired
- **Invalid Cookie Format**: Validate JSON syntax in `config/cookies.json`
- **Missing Cookies**: Ensure all required cookies are present
- **Permission Issues**: Check file permissions on the config directory
