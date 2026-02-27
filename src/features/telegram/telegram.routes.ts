import {
  Router,
  type Router as RouterType,
  type Request,
  type Response,
} from 'express';
import { env } from '../../config/env.js';
import {
  handleTelegramWebhook,
  type TelegramUpdate,
} from '../../services/telegram.service.js';

const router: RouterType = Router();

/**
 * POST /api/telegram/webhook
 * Receives updates from Telegram Bot API.
 * Validates the secret token header if TELEGRAM_WEBHOOK_SECRET is set.
 *
 * When setting up the webhook, include the secret:
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>&secret_token=<SECRET>"
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Validate webhook secret if configured
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (headerSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
        res.sendStatus(403);
        return;
      }
    }

    const update = req.body as TelegramUpdate;
    await handleTelegramWebhook(update);
    // Always respond 200 to Telegram, even if we had internal issues
    res.sendStatus(200);
  } catch (error) {
    console.error('[Telegram] Webhook xatolik:', error);
    res.sendStatus(200);
  }
});

export default router;
