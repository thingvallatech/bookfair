import * as Sentry from '@sentry/sveltekit';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
	Sentry.init({
		dsn,
		environment: import.meta.env.MODE
	});
}

export const handleError = Sentry.handleErrorWithSentry();
export const handle = Sentry.sentryHandle();
