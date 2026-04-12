import { json } from '@sveltejs/kit';
import { db, initDb } from '$lib/server/db.js';
import { env } from '$env/dynamic/public';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function POST({ request, locals }) {
	if (env.PUBLIC_DB_MODE === 'temp') {
		return json({ error: 'Import is not available in temp mode' }, { status: 400 });
	}

	await initDb();

	try {
		const arrayBuffer = await request.arrayBuffer();
		
		// Decompress gzip
		const ds = new DecompressionStream('gzip');
		const writer = ds.writable.getWriter();
		writer.write(new Uint8Array(arrayBuffer));
		writer.close();

		const decompressed = await new Response(ds.readable).text();
		const payload = JSON.parse(decompressed);

		// Validate payload structure
		if (!payload.version || !Array.isArray(payload.boards)) {
			return json({ error: 'Invalid backup file format' }, { status: 400 });
		}

		const userId = locals.user?.id || null;
		let imported = 0;
		let skipped = 0;

		for (const board of payload.boards) {
			try {
				// Skip root boards from other users or temp sessions — they'll get merged/remapped to the current user's root
				const isRoot = board.id.startsWith('root_') || board.id === 'default';
				if (isRoot && locals.user && board.id !== `root_${locals.user.id}`) {
					board.id = `root_${locals.user.id}`;
				}

				// Also remap parent_id if it was a generic/old root
				const isParentRoot = board.parent_id?.startsWith('root_') || board.parent_id === 'default';
				if (isParentRoot && locals.user && board.parent_id !== `root_${locals.user.id}`) {
					board.parent_id = `root_${locals.user.id}`;
				}

				await db.query(`
					INSERT INTO boards (id, name, parent_id, depth, nodes, connections, drawings, user_id, updated_at)
					VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, NOW())
					ON CONFLICT (id) DO UPDATE SET
						name = EXCLUDED.name,
						parent_id = EXCLUDED.parent_id,
						depth = EXCLUDED.depth,
						nodes = EXCLUDED.nodes,
						connections = EXCLUDED.connections,
						drawings = EXCLUDED.drawings,
						user_id = COALESCE(boards.user_id, EXCLUDED.user_id),
						updated_at = NOW();
				`, [
					board.id,
					board.name,
					board.parent_id || null,
					board.depth || 0,
					JSON.stringify(board.nodes || []),
					JSON.stringify(board.connections || []),
					JSON.stringify(board.drawings || []),
					userId,
				]);
				imported++;
			} catch (e) {
				console.warn(`Skipped board ${board.id}:`, e);
				skipped++;
			}
		}

		return json({ success: true, imported, skipped, total: payload.boards.length });
	} catch (error) {
		console.error('Import error:', error);
		return json({ error: 'Failed to import data. Is this a valid .lattice file?' }, { status: 500 });
	}
}
