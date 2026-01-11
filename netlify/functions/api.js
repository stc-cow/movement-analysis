// Simple API handler for Netlify Functions
// This bypasses serverless-http to avoid bundling issues

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Simple URL routing
exports.handler = async (event, context) => {
  try {
    const { path: eventPath, httpMethod, body, headers } = event;
    
    console.log(`[API] ${httpMethod} ${eventPath}`);

    // Parse the route
    const url = new URL(eventPath || '/', 'http://dummy');
    const pathname = url.pathname;

    // Health check
    if (pathname === '/api/ping') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'pong', timestamp: new Date().toISOString() }),
      };
    }

    // Data routes - try to load from the built server
    if (pathname.startsWith('/api/data/')) {
      try {
        // Try to import the server module
        const serverPath = path.join(__dirname, '..', '..', 'server', 'routes', 'data.ts');
        console.log(`[API] Attempting to load server from: ${serverPath}`);
        
        // For now, return a placeholder until we can properly load the server
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movements: [],
            cows: [],
            locations: [],
            events: [],
            note: 'Data endpoint stub - server integration in progress',
          }),
        };
      } catch (error) {
        console.error('[API] Data route error:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Data service error', details: String(error) }),
        };
      }
    }

    // Fallback
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('[API] Handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: String(error),
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
