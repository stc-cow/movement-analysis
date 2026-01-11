// Netlify Function API Handler
// Uses serverless-http to wrap our Express server

require('dotenv').config();

// Use dynamic import for ESM module
let handler;
let serverlessHttp;

const initializeHandler = async () => {
  if (handler) return handler;

  try {
    // Import serverless-http
    serverlessHttp = require('serverless-http');

    // Try to load the built Express server
    try {
      const serverModule = require('../../server');
      const app = serverModule.createServer();

      handler = serverlessHttp(app, {
        basePath: '/.netlify/functions/api',
      });

      console.log('[API] Successfully loaded Express server');
    } catch (serverError) {
      console.warn('[API] Could not load server module, creating minimal Express app:', serverError.message);

      // Fallback: create a minimal Express app
      const express = require('express');
      const cors = require('cors');

      const app = express();
      app.use(cors());
      app.use(express.json());

      // Health check
      app.get('/api/ping', (req, res) => {
        res.json({ message: 'pong', timestamp: new Date().toISOString() });
      });

      // Stub data endpoint
      app.use('/api/data', (req, res) => {
        res.json({
          movements: [],
          cows: [],
          locations: [],
          events: [],
          note: 'Data endpoint using fallback server',
        });
      });

      handler = serverlessHttp(app, {
        basePath: '/.netlify/functions/api',
      });
    }

    return handler;
  } catch (error) {
    console.error('[API] Failed to initialize handler:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  try {
    const handlerFunc = await initializeHandler();
    return handlerFunc(event, context);
  } catch (error) {
    console.error('[API] Handler execution error:', error);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to initialize API',
        message: String(error),
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
