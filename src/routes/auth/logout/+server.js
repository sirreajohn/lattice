import { db, initDb } from '$lib/server/db.js';
import { redirect } from '@sveltejs/kit';

export async function POST({ cookies }) {
	const session = cookies.get('session');
	if (session) {
		await initDb();
		try {
			await db.query('DELETE FROM sessions WHERE token = $1', [session]);
		} catch (e) {}
	}
	cookies.delete('session', { path: '/' });
	throw redirect(303, '/auth/login');
}
