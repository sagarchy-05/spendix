// Password strength rules — kept in sync with backend/src/utils/passwordValidator.js
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

export const validatePassword = (password) => {
  const results = PASSWORD_RULES.map((rule) => ({
    message: rule.message,
    passed: typeof password === 'string' && rule.test(password),
  }));
  const valid = results.every((r) => r.passed);
  return { valid, results };
};
