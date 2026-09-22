import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { env } from './config/env';

import rateLimit from 'express-rate-limit';

export const createApp = (): Application => {
  const app = express();

  // Security & Utility Middlewares
  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate Limiting (disabled or high limit in test environment)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'test' ? 10000 : 200,
    message: { success: false, message: 'Terlalu banyak permintaan dari IP ini, coba lagi nanti.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'test' ? 1000 : 15,
    message: { success: false, message: 'Terlalu banyak percobaan autentikasi, silakan coba lagi dalam 15 menit.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth', authLimiter);

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Base API Route
  app.use('/api', routes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Rute '${req.method} ${req.originalUrl}' tidak ditemukan`,
    });
  });

  // Global Error Handler Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
