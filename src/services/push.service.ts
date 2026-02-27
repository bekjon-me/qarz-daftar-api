/**
 * Expo Push Notification Service
 *
 * Sends push notifications via the Expo Push API.
 * No special credentials needed — just the user's Expo push token.
 *
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Send a single push notification via Expo Push API.
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<PushTicket | null> {
  if (!expoPushToken || !isExpoPushToken(expoPushToken)) {
    console.warn(`[Push] Yaroqsiz Expo push token: ${expoPushToken}`);
    return null;
  }

  const message: PushMessage = {
    to: expoPushToken,
    title,
    body,
    data,
    sound: 'default',
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        `[Push] Expo API xatosi: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const result = (await response.json()) as { data: PushTicket };
    const ticket = result.data;

    if (ticket.status === 'error') {
      console.error(`[Push] Xatolik: ${ticket.message}`, ticket.details);
    }

    return ticket;
  } catch (error) {
    console.error('[Push] Push bildirishnoma yuborishda xatolik:', error);
    return null;
  }
}

/**
 * Send push notifications to multiple tokens in a batch.
 * Expo supports up to 100 messages per request.
 */
export async function sendPushNotificationBatch(
  messages: Array<{
    token: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>,
): Promise<void> {
  const validMessages = messages.filter((m) => isExpoPushToken(m.token));
  if (validMessages.length === 0) return;

  // Expo supports up to 100 per batch
  const chunks = chunkArray(validMessages, 100);

  for (const chunk of chunks) {
    const pushMessages: PushMessage[] = chunk.map((m) => ({
      to: m.token,
      title: m.title,
      body: m.body,
      data: m.data,
      sound: 'default' as const,
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(pushMessages),
      });

      if (!response.ok) {
        console.error(
          `[Push] Batch xatosi: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error('[Push] Batch yuborishda xatolik:', error);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function isExpoPushToken(token: string): boolean {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken['))
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
