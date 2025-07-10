#!/bin/sh

# Ensure uploads directory exists and has correct permissions
mkdir -p /app/uploads
chown -R nextjs:nodejs /app/uploads || true

# Start the application
exec npm start
