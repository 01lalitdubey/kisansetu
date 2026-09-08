import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { openapiSpec } from './docs/openapi';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import { postWebhook } from './controllers/paymentController';

import authRoutes from './routes/authRoutes';
import farmerRoutes from './routes/farmerRoutes';
import centerRoutes from './routes/centerRoutes';
import centerHistoryRoutes from './routes/centerHistoryRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import queueRoutes from './routes/queueRoutes';
import tokenRoutes from './routes/tokenRoutes';
import procurementRoutes from './routes/procurementRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import aiRoutes from './routes/aiRoutes';
import demoRoutes from './routes/demoRoutes';
import transportRoutes from './routes/transportRoutes';
import paymentRoutes from './routes/paymentRoutes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );

  // Stripe webhook needs the raw body for signature verification — mount it
  // BEFORE the JSON parser.
  app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), postWebhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', service: 'kisansetu-ai-backend', time: new Date().toISOString() },
    });
  });

  // API docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

  // Feature routes
  app.use('/api/auth', authRoutes);
  app.use('/api/farmers', farmerRoutes);
  app.use('/api/centers', centerRoutes);
  app.use('/api/center', centerHistoryRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/queue', queueRoutes);
  app.use('/api/tokens', tokenRoutes);
  app.use('/api/procurements', procurementRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/demo', demoRoutes);
  app.use('/api/transport', transportRoutes);
  app.use('/api/payments', paymentRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
