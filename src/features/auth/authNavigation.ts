// These are the only post-authentication destinations currently used by the app.
export function safeAuthDestination(value: string | null): string {
  return value === '/reset-password' ? '/reset-password' : '/dashboard';
}

export function googleOAuthOptions(origin: string) {
  return {
    provider: 'google' as const,
    options: {
      redirectTo: new URL('/auth/callback', origin).toString(),
      scopes: 'openid email profile',
      queryParams: { prompt: 'select_account' },
    },
  };
}
