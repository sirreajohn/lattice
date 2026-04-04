import { env } from '$env/dynamic/public';

export async function load({ locals }) {

	console.log(`starting in ${env.PUBLIC_DB_MODE}`)
	if (env.PUBLIC_DB_MODE === 'temp') return { user: null };

	return {
		user: locals.user || null
	};
}
