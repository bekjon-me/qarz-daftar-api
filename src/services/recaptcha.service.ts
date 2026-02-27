import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptcha(
  token: string,
  expectedAction?: string,
): Promise<{ success: boolean; score: number }> {
  // Check if secret key is configured
  if (!env.RECAPTCHA_SECRET_KEY) {
    console.error('[reCAPTCHA] RECAPTCHA_SECRET_KEY is not configured');
    throw ApiError.internal('reCAPTCHA is not configured');
  }

  if (!token) {
    console.error('[reCAPTCHA] No token provided');
    throw ApiError.badRequest('reCAPTCHA token is required');
  }

  console.log('[reCAPTCHA] Verifying token for action:', expectedAction);

  // Bypass for web development if dummy token is provided
  if (env.NODE_ENV === 'development' && token === 'web_dummy_token') {
    console.log('[reCAPTCHA] Bypassing verification for web_dummy_token');
    return { success: true, score: 1.0 };
  }

  try {
    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: env.RECAPTCHA_SECRET_KEY,
          response: token,
        }),
      },
    );

    const data = (await response.json()) as RecaptchaVerifyResponse;
    console.log('[reCAPTCHA] Response:', JSON.stringify(data, null, 2));

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.error('[reCAPTCHA] Verification failed:', errorCodes);
      throw ApiError.badRequest(
        `reCAPTCHA verification failed: ${errorCodes.join(', ')}`,
      );
    }

    const score = data.score ?? 0;
    const threshold = env.RECAPTCHA_SCORE_THRESHOLD;

    console.log(
      `[reCAPTCHA] Score: ${score} | Threshold: ${threshold} | Action: ${data.action} | Expected: ${expectedAction} | Pass: ${score >= threshold}`,
    );

    // Check if score meets threshold
    if (score < threshold) {
      console.warn(
        `[reCAPTCHA] BLOCKED — score ${score} < threshold ${threshold}`,
      );
      throw ApiError.forbidden(
        'Suspicious activity detected. Please try again.',
      );
    }

    // Optionally verify the action matches
    if (expectedAction && data.action !== expectedAction) {
      console.warn(
        `[reCAPTCHA] Action mismatch: expected "${expectedAction}", got "${data.action}"`,
      );
      throw ApiError.badRequest('reCAPTCHA action mismatch');
    }

    console.log(`[reCAPTCHA] PASSED — score ${score}`);
    return { success: true, score };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('reCAPTCHA verification error:', error);
    throw ApiError.internal('Failed to verify reCAPTCHA');
  }
}
