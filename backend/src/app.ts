import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { serveSitemap } from './controllers/sitemap.controller';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // Not under /api — the storefront domain rewrites /sitemap.xml straight here.
  app.get('/sitemap.xml', serveSitemap);

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
