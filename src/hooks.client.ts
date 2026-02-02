import { handleErrorWithSentry } from '@sentry/sveltekit';
import { initSentryClient } from '$lib/sentry';

initSentryClient();

export const handleError = handleErrorWithSentry();
