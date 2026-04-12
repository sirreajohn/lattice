import { json } from '@sveltejs/kit';
import zlib from 'node:zlib';
import { db, initDb } from '$lib/server/db.js';
import { env } from '$env/dynamic/public';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function GET({ locals }) {
	if (env.PUBLIC_DB_MODE === 'temp') {
		return json({ error: 'Export is not available in temp mode' }, { status: 400 });
	}

	await initDb();

	try {
		let res;
		if (locals.user) {
			res = await db.query('SELECT * FROM boards WHERE user_id = $1', [locals.user.id]);
		} else {
			res = await db.query('SELECT * FROM boards');
		}

		const payload = {
			version: 1,
			exportedAt: new Date().toISOString(),
			userId: locals.user?.id || null,
			boards: res.rows.map((/** @type {any} */ row) => ({
				id: row.id,
				name: row.name,
				parent_id: row.parent_id,
				depth: row.depth || 0,
				nodes: row.nodes || [],
				connections: row.connections || [],
				drawings: row.drawings || [],
			})),
		};

		const jsonStr = JSON.stringify(payload);
		const encoded = new TextEncoder().encode(jsonStr);

		// Compress with gzip synchronously using node:zlib
		const compressed = zlib.gzipSync(encoded);

		return new Response(compressed, {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="lattice-backup-${new Date().toISOString().slice(0, 10)}.lattice"`,
			},
		});
	} catch (error) {
		console.error('Export error:', error);
		return json({ error: 'Failed to export data' }, { status: 500 });
	}
}
