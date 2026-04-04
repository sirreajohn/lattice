import { db, initDb } from '$lib/server/db.js';
import bcrypt from 'bcryptjs';
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');

		if (!username || !password) return fail(400, { error: 'Missing fields' });

		await initDb();
		const res = await db.query('SELECT * FROM users WHERE username = $1', [username]);
		if (res.rows.length === 0) return fail(400, { error: 'Invalid username or password' });

		const user = res.rows[0];
		const match = await bcrypt.compare(password, user.password_hash);
		if (!match) return fail(400, { error: 'Invalid username or password' });

		const token = crypto.randomUUID();
		const expires = new Date();
		expires.setDate(expires.getDate() + 30); // 30 days
		await db.query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, user.id, expires.toISOString()]);

		cookies.set('session', token, { path: '/', httpOnly: true, secure: false, expires });
		throw redirect(303, '/');
	}
};
