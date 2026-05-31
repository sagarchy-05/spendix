// JWT `aud` claims. Both tokens are signed with JWT_SECRET; without an audience
// a leaked verification token would happily pass as a session token. Each
// verifier checks the claim that matches its purpose so the two issuances
// can't be cross-used.
export const AUD_SESSION = 'spendix:session';
export const AUD_VERIFY_EMAIL = 'spendix:verify-email';
export const AUD_PASSWORD_RESET = 'spendix:password-reset';
