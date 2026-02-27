import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './features/auth/auth.routes.js';
import customerRoutes from './features/customer/customer.routes.js';
import transactionRoutes from './features/transaction/transaction.routes.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';
import notificationRoutes from './features/notification/notification.routes.js';
import userRoutes from './features/user/user.routes.js';
import telegramRoutes from './features/telegram/telegram.routes.js';
import { errorHandler } from './middleware/error-handler.js';

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/telegram', telegramRoutes);

// 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint topilmadi',
  });
});

app.use(errorHandler);

export default app;
