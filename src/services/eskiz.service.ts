import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

let cachedToken: string | null = null;

interface EskizAuthResponse {
  message: string;
  data: { token: string };
  token_type: string;
}

interface EskizSmsResponse {
  id: string;
  message: string;
  status: string;
}

interface EskizErrorResponse {
  message?: string;
  error?: string;
}

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  if (!env.ESKIZ_EMAIL || !env.ESKIZ_PASSWORD) {
    console.error('Eskiz credentials not configured');
    throw ApiError.serviceUnavailable(
      "SMS xizmati sozlanmagan. Administrator bilan bog'laning.",
    );
  }

  const formData = new FormData();
  formData.append('email', env.ESKIZ_EMAIL);
  formData.append('password', env.ESKIZ_PASSWORD);

  let res: Response;
  try {
    res = await fetch(`${env.ESKIZ_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('Eskiz network error:', error);
    throw ApiError.serviceUnavailable(
      "SMS xizmatiga ulanib bo'lmadi. Keyinroq urinib ko'ring.",
    );
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Eskiz auth failed [${res.status}]:`, errorBody);

    if (res.status === 401) {
      throw ApiError.serviceUnavailable(
        'SMS xizmati autentifikatsiyasi muvaffaqiyatsiz.',
      );
    }

    throw ApiError.serviceUnavailable(
      "SMS xizmati vaqtincha ishlamayapti. Keyinroq urinib ko'ring.",
    );
  }

  const data = (await res.json()) as EskizAuthResponse;
  cachedToken = data.data.token;
  return cachedToken;
}

async function refreshToken(): Promise<string> {
  if (!cachedToken) return getToken();

  let res: Response;
  try {
    res = await fetch(`${env.ESKIZ_BASE_URL}/auth/refresh`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cachedToken}` },
    });
  } catch {
    cachedToken = null;
    return getToken();
  }

  if (!res.ok) {
    cachedToken = null;
    return getToken();
  }

  const data = (await res.json()) as EskizAuthResponse;
  cachedToken = data.data.token;
  return cachedToken;
}

export async function sendSms(phone: string, message: string): Promise<void> {
  if (!phone || !message) {
    throw ApiError.badRequest('Telefon raqam va xabar matni kiritilishi shart');
  }

  let token = await getToken();

  const attempt = async (authToken: string): Promise<Response> => {
    const formData = new FormData();
    formData.append('mobile_phone', phone.replace(/\D/g, ''));
    formData.append('message', message);
    formData.append('from', env.ESKIZ_SENDER);

    return fetch(`${env.ESKIZ_BASE_URL}/message/sms/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
  };

  let res: Response;
  try {
    res = await attempt(token);
  } catch (error) {
    console.error('Eskiz SMS network error:', error);
    throw ApiError.serviceUnavailable(
      "SMS xizmatiga ulanib bo'lmadi. Keyinroq urinib ko'ring.",
    );
  }

  if (res.status === 401) {
    token = await refreshToken();
    try {
      res = await attempt(token);
    } catch (error) {
      console.error('Eskiz SMS retry network error:', error);
      throw ApiError.serviceUnavailable(
        "SMS xizmatiga ulanib bo'lmadi. Keyinroq urinib ko'ring.",
      );
    }
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Eskiz SMS send failed [${res.status}]:`, errorBody);

    let errorMessage = 'SMS yuborishda xatolik yuz berdi';
    try {
      const errorData = JSON.parse(errorBody) as EskizErrorResponse;
      if (errorData.message) {
        errorMessage = `SMS yuborishda xatolik: ${errorData.message}`;
      }
    } catch {
      // Use default error message
    }

    throw ApiError.serviceUnavailable(errorMessage);
  }

  const responseData = (await res.json()) as EskizSmsResponse;
  console.log('SMS sent successfully:', responseData.id, responseData.status);
}
