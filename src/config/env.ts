import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Eskiz SMS
  ESKIZ_EMAIL: process.env.ESKIZ_EMAIL || process.env.ESKIZ_USERNAME || '',
  ESKIZ_PASSWORD: process.env.ESKIZ_PASSWORD || '',
  ESKIZ_BASE_URL: process.env.ESKIZ_BASE_URL || 'https://notify.eskiz.uz/api',
  ESKIZ_SENDER: process.env.ESKIZ_SENDER || '4546',

  // OTP
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '3', 10),
  OTP_COOLDOWN_SECONDS: parseInt(process.env.OTP_COOLDOWN_SECONDS || '60', 10),

  // Google
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',

  // reCAPTCHA v3
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || '',
  RECAPTCHA_SCORE_THRESHOLD: parseFloat(
    process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5',
  ),
} as const;
