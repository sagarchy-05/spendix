const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare-published test secrets (https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
// Short-circuited below so dev still works behind corporate MITM proxies that
// re-sign TLS certs (which break Node fetch to challenges.cloudflare.com
// with UNABLE_TO_GET_ISSUER_CERT_LOCALLY).
const TURNSTILE_TEST_SECRETS = {
  PASS: '1x0000000000000000000000000000000AA',
  FAIL: '2x0000000000000000000000000000000AA',
};

// Verifies a Cloudflare Turnstile token. Returns { ok: true } on success or
// { ok: false, status, message, errors } on failure.
export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return {
      ok: false,
      status: 500,
      message: 'CAPTCHA verification is not configured on server',
    };
  }

  if (!token) {
    return { ok: false, status: 400, message: 'CAPTCHA token missing' };
  }

  // Dev shortcut for Cloudflare's documented test secrets — outcome is fixed,
  // no need to hit the network (which avoids corporate-MITM cert errors).
  if (secret === TURNSTILE_TEST_SECRETS.PASS) return { ok: true };
  if (secret === TURNSTILE_TEST_SECRETS.FAIL) {
    return {
      ok: false,
      status: 403,
      message: 'CAPTCHA verification failed (test-fail key in use)',
    };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const cfRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: params,
    });
    const data = await cfRes.json();

    if (!data.success) {
      return {
        ok: false,
        status: 403,
        message: 'CAPTCHA verification failed',
        errors: data['error-codes'] || [],
      };
    }

    return { ok: true };
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return {
      ok: false,
      status: 500,
      message: 'CAPTCHA verification request failed',
    };
  }
}
