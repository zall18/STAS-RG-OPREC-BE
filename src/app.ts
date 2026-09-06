import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { env } from './config/env';

export const createApp = (): Application => {
  const app = express();

  // Security & Utility Middlewares
  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
