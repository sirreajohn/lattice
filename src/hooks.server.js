import { db, initDb } from '$lib/server/db.js';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	if (env.PUBLIC_DB_MODE === 'temp') {
		if (event.url.pathname.startsWith('/auth')) {
			throw redirect(303, '/');
		}
		return await resolve(event);
	}

	await initDb();
	const sessionId = event.cookies.get('session');
	
	if (sessionId && db) {
		try {
			const res = await db.query(`
				SELECT u.id, u.username 
				FROM sessions s 
				JOIN users u ON s.user_id = u.id 
				WHERE s.token = $1 AND s.expires_at > NOW()
			`, [sessionId]);
			
			if (res.rows.length > 0) {
				event.locals.user = res.rows[0];
			} else {
				// Invalid or expired session
				event.cookies.delete('session', { path: '/' });
			}
		} catch (e) {
			console.error("Session verification error", e);
		}
	}

	const isAuthRoute = event.url.pathname.startsWith('/auth');
	const isApiRoute = event.url.pathname.startsWith('/api/');
	
	if (!event.locals.user && !isAuthRoute) {
		if (isApiRoute) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		}
		throw redirect(303, '/auth/login');
	}

	if (event.locals.user && isAuthRoute) {
		if (event.url.pathname === '/auth/logout') {
			return await resolve(event);
		}
		throw redirect(303, '/');
	}

	return await resolve(event);
}
