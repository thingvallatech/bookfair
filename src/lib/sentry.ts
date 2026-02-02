import * as Sentry from '@sentry/sveltekit';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentryClient(): void {
	if (!dsn) return;

	Sentry.init({
		dsn,
		environment: import.meta.env.MODE,
		tracesSampleRate: 0.1,
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 0.5
	});
}
