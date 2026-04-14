import { json } from '@sveltejs/kit';
import { db, initDb } from '$lib/server/db.js';
import { env } from '$env/dynamic/public';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function POST({ request, locals }) {
	try {
		const payload = await request.json();

		// Validate payload structure
		if (!payload.version || !Array.isArray(payload.boards)) {
			return json({ error: 'Invalid backup file format' }, { status: 400 });
		}

		if (env.PUBLIC_DB_MODE === 'temp') {
			return json({ success: true, payload });
		}

		await initDb();

		const userId = locals.user?.id || null;
		const currentPrimaryRootId = userId ? `root_${userId}` : null;
		
		let oldPrimaryRootId = payload.userId ? `root_${payload.userId}` : 'default';
		if (!payload.boards.some(b => b.id === oldPrimaryRootId)) {
			const inferredRoot = payload.boards.find(b => !b.parent_id && (b.id === 'default' || b.id.startsWith('root_')));
			if (inferredRoot) oldPrimaryRootId = inferredRoot.id;
		}

		let imported = 0;
		let skipped = 0;

		for (const board of payload.boards) {
			try {
				if (currentPrimaryRootId && oldPrimaryRootId && oldPrimaryRootId !== currentPrimaryRootId) {
					if (board.id === oldPrimaryRootId) {
						board.id = currentPrimaryRootId;
					}
					if (board.parent_id === oldPrimaryRootId) {
						board.parent_id = currentPrimaryRootId;
					}
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
		return json({ error: 'Failed to import data: ' + (error instanceof Error ? error.stack : String(error)) }, { status: 500 });
	}
}
