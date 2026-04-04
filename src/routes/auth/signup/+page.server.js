import { db, initDb } from '$lib/server/db.js';
import bcrypt from 'bcryptjs';
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!username || !password || username.length < 3 || password.length < 6) {
			return fail(400, { error: 'Username must be >= 3 and password >= 6 characters' });
		}

		await initDb();
		try {
			const hash = await bcrypt.hash(password, 10);
			const userId = crypto.randomUUID();
			await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)', [userId, username, hash]);

			const token = crypto.randomUUID();
			const expires = new Date();
			expires.setDate(expires.getDate() + 30);
			await db.query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expires.toISOString()]);

			cookies.set('session', token, { path: '/', httpOnly: true, secure: false, expires });
		} catch (e) {
			if (e.message.includes('unique constraint')) {
				return fail(400, { error: 'Username already exists' });
			}
			return fail(500, { error: 'Database error' });
		}
		throw redirect(303, '/');
	}
};
