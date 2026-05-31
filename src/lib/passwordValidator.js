// Server-side mirror of utils/passwordValidator.js. Same rules, returns
// { valid, errors[] } for API responses instead of UI-shaped results.
export const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, message: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'At least one uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'At least one lowercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'At least one number' },
  {
    test: (p) => /[^A-Za-z0-9]/.test(p),
    message: 'At least one special character',
  },
];

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, errors: ['Password is required'] };
  }
  const errors = PASSWORD_RULES.filter((r) => !r.test(password)).map(
    (r) => r.message
  );
  return { valid: errors.length === 0, errors };
}
