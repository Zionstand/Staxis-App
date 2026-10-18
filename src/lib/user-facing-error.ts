type ErrorResponse = { response?: { status?: number; data?: { message?: unknown } }; code?: string };

export function getUserFacingError(error: unknown, fallback = 'We could not complete that request. Please try again or contact support if it continues.'): string {
  const failure = error as ErrorResponse | null;
  if (!failure?.response || failure.code === 'ECONNABORTED' || failure.code === 'ETIMEDOUT') {
    return 'We could not reach the server. Check your connection and try again. If it continues, please try later or contact support.';
  }
  const status = failure.response.status ?? 0;
  if (status >= 500) return 'The service is temporarily unavailable. Please try again later or contact support if it continues.';
  if (status === 429) return 'Too many attempts. Please wait a little and try again.';
  return fallback;
}

/** Translate only recognised validation responses; never display raw server output. */
export function getAuthFieldErrors(error: unknown, fields: readonly string[]): Record<string, string> {
  const response = (error as ErrorResponse | null)?.response;
  if (!response || ![400, 401, 404, 409, 422].includes(response.status ?? 0)) return {};
  const raw = response.data?.message;
  const messages = (Array.isArray(raw) ? raw : [raw]).filter((m): m is string => typeof m === 'string');
  const result: Record<string, string> = {};
  for (const message of messages) {
    const normalized = message.toLowerCase();
    if (fields.includes('password') && /invalid credentials/.test(normalized)) {
      result.password = 'The email or password is incorrect. Check both and try again.';
    } else if (fields.includes('email') && /user already exists|account.*already exists/.test(normalized)) {
      result.email = 'An account already uses this email. Sign in or use another email.';
    } else if (fields.includes('email') && /no account with that email/.test(normalized)) {
      result.email = 'No account was found with this email. Check the address and try again.';
    } else if (fields.includes('confirmPassword') && /password.*not match/.test(normalized)) {
      result.confirmPassword = 'Passwords do not match.';
    } else if (fields.includes('otp') && /invalid.*otp|otp.*expired/.test(normalized)) {
      result.otp = 'This code is invalid or has expired. Request a new code and try again.';
    } else if ([400, 422].includes(response.status ?? 0)) {
      const rules: [string, RegExp, string][] = [
        ['firstName', /first\s?name/, 'First name must be between 2 and 100 characters.'],
        ['lastName', /last\s?name/, 'Last name must be between 2 and 100 characters.'],
        ['email', /email/, 'Enter a valid email address.'],
        ['phoneNumber', /phone\s?number/, 'Enter a valid phone number.'],
        ['password', /password/, 'Enter a password between 8 and 50 characters.'],
        ['newPassword', /password/, 'Enter a password between 8 and 50 characters.'],
        ['acceptTerms', /acceptterms/, 'Please accept the Terms of Service and Privacy Policy.'],
      ];
      for (const [field, match, safeMessage] of rules) {
        if (fields.includes(field) && match.test(normalized)) { result[field] = safeMessage; break; }
      }
    }
  }
  return result;
}
