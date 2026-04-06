import { json } from '@sveltejs/kit';
import { db, initDb } from '$lib/server/db.js';
import { env } from '$env/dynamic/public';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function GET({ locals }) {
	await initDb();
	try {
        let res;
        if (env.PUBLIC_DB_MODE === 'temp') {
            return json({ boards: [] });
        }

		// @ts-ignore
		if (locals.user && db) {
			// @ts-ignore
			res = await db.query('SELECT id, name, updated_at FROM boards WHERE user_id = $1 ORDER BY updated_at DESC', [locals.user.id]);
		} else if (db) {
            // Local mode typically allows all, or we fetch all boards with user_id IS NULL or something.
            // Just returning all boards ordered by updated_at
            res = await db.query('SELECT id, name, updated_at FROM boards ORDER BY updated_at DESC');
        } else {
			return json({ boards: [] });
		}
		return json({ boards: res.rows });
	} catch (error) {
		console.error("GET boards list error:", error);
		return json({ error: "Failed to load boards" }, { status: 500 });
	}
}
