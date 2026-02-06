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

    const data: RecaptchaVerifyResponse = await response.json();
    console.log('[reCAPTCHA] Response:', JSON.stringify(data, null, 2));

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.error('[reCAPTCHA] Verification failed:', errorCodes);
      throw ApiError.badRequest(
        `reCAPTCHA verification failed: ${errorCodes.join(', ')}`,
      );
    }

    console.log(data.score);

    const score = data.score ?? 0;

    // Check if score meets threshold
    if (score < env.RECAPTCHA_SCORE_THRESHOLD) {
      console.warn(
        `reCAPTCHA score too low: ${score} < ${env.RECAPTCHA_SCORE_THRESHOLD}`,
      );
      throw ApiError.forbidden(
        'Suspicious activity detected. Please try again.',
      );
    }

    // Optionally verify the action matches
    if (expectedAction && data.action !== expectedAction) {
      console.warn(
        `reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.action}`,
      );
      throw ApiError.badRequest('reCAPTCHA action mismatch');
    }

    return { success: true, score };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('reCAPTCHA verification error:', error);
    throw ApiError.internal('Failed to verify reCAPTCHA');
  }
}
