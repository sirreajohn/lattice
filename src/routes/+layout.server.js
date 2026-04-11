import { env } from '$env/dynamic/public';
import { dbType } from '$lib/server/db.js';

export async function load({ locals }) {
	if (env.PUBLIC_DB_MODE === 'temp') return { user: null, dbType: 'temp' };

	return {
		user: locals.user || null,
		dbType
	};
}
