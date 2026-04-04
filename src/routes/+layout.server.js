import { env } from '$env/dynamic/public';

export async function load({ locals }) {
	if (env.PUBLIC_DB_MODE === 'temp') return { user: null };

	return {
		user: locals.user || null
	};
}
