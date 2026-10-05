type LangPair = { en: string; ar: string };

const MAP: Record<string, LangPair> = {
  auth_invalid: {
    en: 'Email or password is incorrect.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  },
  auth_unverified: {
    en: 'Please verify your email before continuing.',
    ar: 'يرجى تأكيد بريدك الإلكتروني قبل المتابعة.',
  },
  auth_callback: {
    en: 'This verification link is invalid or expired. Request a new verification email.',
    ar: 'رابط التأكيد غير صالح أو منتهي. اطلب رسالة تأكيد جديدة.',
  },
  session_expired: {
    en: 'Your session expired. Please sign in again.',
    ar: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجددًا.',
  },
  offline: {
    en: 'You are offline. Changes are saved locally until connection returns.',
    ar: 'أنت غير متصل. حُفظت التغييرات محليًا حتى يعود الاتصال.',
  },
  sync_failed: {
    en: 'We could not sync your changes yet. They remain safely on this device.',
    ar: 'تعذر مزامنة تغييراتك الآن. ما زالت محفوظة بأمان على هذا الجهاز.',
  },
  address_failed: {
    en: 'We could not save the address. Please try again.',
    ar: 'تعذر حفظ العنوان. حاول مرة أخرى.',
  },
  email_exists: {
    en: 'An account with this email already exists. Sign in instead.',
    ar: 'يوجد حساب بهذا البريد بالفعل. سجّل الدخول بدلًا من ذلك.',
  },
  signup_disabled: {
    en: 'Account creation is temporarily unavailable. Please try again later.',
    ar: 'إنشاء الحساب غير متاح مؤقتًا. حاول مرة أخرى لاحقًا.',
  },
  signup_database: {
    en: 'We could not create the account right now. Please try again shortly.',
    ar: 'تعذر إنشاء الحساب الآن. حاول مرة أخرى بعد قليل.',
  },
  email_delivery: {
    en: 'Your account was created, but the verification email could not be sent. Please resend it in a moment.',
    ar: 'تم إنشاء حسابك لكن تعذر إرسال رسالة التأكيد. أعد إرسالها بعد قليل.',
  },
  cloud_config: {
    en: 'Account service is temporarily unavailable. Please try again shortly.',
    ar: 'خدمة الحساب غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.',
  },
  auth_network: {
    en: 'The account service could not be reached. Check your connection and try again.',
    ar: 'تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت وحاول مرة أخرى.',
  },
  weak_password: {
    en: 'Choose a stronger password with at least 8 characters.',
    ar: 'اختر كلمة مرور أقوى لا تقل عن 8 أحرف.',
  },
  rate_limit: {
    en: 'Too many attempts. Wait a minute, then try again.',
    ar: 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.',
  },
  generic: {
    en: 'Something went wrong. Please try again.',
    ar: 'حدث خطأ ما. حاول مرة أخرى.',
  },
};

export function mapError(error: unknown): {
  code: string;
  message: LangPair;
  debug?: string;
} {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '');
  const text = message.toLowerCase();
  let code = 'generic';
  if (text.includes('invalid login') || text.includes('invalid credentials')) code = 'auth_invalid';
  else if (
    text.includes('already registered') ||
    text.includes('user already exists') ||
    text.includes('account with this email already exists')
  )
    code = 'email_exists';
  else if (text.includes('signup is disabled') || text.includes('signups not allowed'))
    code = 'signup_disabled';
  else if (text.includes('database error saving new user') || text.includes('error saving new user'))
    code = 'signup_database';
  else if (
    text.includes('error sending confirmation') ||
    text.includes('confirmation email') ||
    text.includes('email address not authorized')
  )
    code = 'email_delivery';
  else if (
    text.includes('account service is not configured') ||
    text.includes('supabase url') ||
    text.includes('publishable key')
  )
    code = 'cloud_config';
  else if (
    text.includes('failed to fetch') ||
    text.includes('network request') ||
    text.includes('networkerror') ||
    text.includes('timeout') ||
    text.includes('temporarily unavailable')
  )
    code = 'auth_network';
  else if (text.includes('password should be') || text.includes('weak password'))
    code = 'weak_password';
  else if (text.includes('rate limit') || text.includes('too many requests')) code = 'rate_limit';
  else if (text.includes('email not confirmed')) code = 'auth_unverified';
  else if (
    text.includes('otp has expired') ||
    text.includes('token has expired') ||
    text.includes('invalid token') ||
    text.includes('invalid otp')
  )
    code = 'auth_callback';
  else if (text.includes('jwt') || text.includes('session')) code = 'session_expired';
  else if (!globalThis.navigator?.onLine) code = 'offline';
  const mapped = MAP[code] || MAP.generic;
  if (!mapped) {
    return { code: 'generic', message: { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ ما. حاول مرة أخرى.' } };
  }
  const result: { code: string; message: LangPair; debug?: string } = {
    code,
    message: mapped,
  };
  if (import.meta?.env?.DEV) result.debug = message || String(error);
  return result;
}

export const errorText = (error: unknown, language = 'en'): string => {
  const mapped = mapError(error).message;
  return mapped[language as 'en' | 'ar'] || mapped.en;
};
