import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './features/auth/auth.routes.js';
import { errorHandler } from './middleware/error-handler.js';

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.use(errorHandler);

export default app;
