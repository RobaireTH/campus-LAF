export const AUTH_LIMITS = {
  register: { perIp: { max: 30, windowSeconds: 3600 } },
  login: {
    perIp: { max: 100, windowSeconds: 900 },
    perEmail: { max: 10, windowSeconds: 900 },
  },
} as const;
