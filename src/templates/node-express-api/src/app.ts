import express from 'express';
import { env } from './config/env.js';
import { requestLogger } from './middleware/logging.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRoutes } from './routes/index.js';
import { getHealth } from './controllers/health.controller.js';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Top-level health check endpoint
  app.get('/health', getHealth);

  // Versioned API routes
  app.use(env.API_PREFIX, apiRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
