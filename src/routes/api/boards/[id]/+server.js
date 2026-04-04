import { json } from '@sveltejs/kit';
import { db, initDb } from '$lib/server/db.js';

export async function GET({ params, url }) {
	const { id } = params;
	const parentIdParam = url.searchParams.get('parent');
	await initDb();
	
	try {
		const res = await db.query('SELECT * FROM boards WHERE id = $1', [id]);
		
		// If board doesn't exist yet, we compute lineage starting from parentIdParam
		const lineageId = res.rows.length > 0 ? id : parentIdParam;
		const lineageFilter = res.rows.length > 0 ? id : null;

		// Recursive CTE to get full lineage (path of board names)
		const lineageRes = await db.query(`
			WITH RECURSIVE lineage AS (
				SELECT id, name, parent_id, 0 as level
				FROM boards
				WHERE id = $1
				UNION ALL
				SELECT b.id, b.name, b.parent_id, l.level + 1
				FROM boards b
				JOIN lineage l ON b.id = l.parent_id
			)
			SELECT id, name FROM lineage WHERE id != $2 ORDER BY level DESC
		`, [lineageId, lineageFilter]);

		if (res.rows.length > 0) {
			const board = res.rows[0];
			board.lineage = lineageRes.rows;
			return json(board);
		}
		// Return empty scaffold if new board
		return json({ id, name: `board_${id.slice(0,6)}`, parentId: parentIdParam, depth: 0, nodes: [], connections: [], lineage: lineageRes.rows });
	} catch (error) {
		console.error("GET board error:", error);
		return json({ error: "Failed to load board" }, { status: 500 });
	}
}

export async function PUT({ params, request }) {
	const { id } = params;
	await initDb();
	
	try {
		const payload = await request.json();
		
		await db.query(`
			INSERT INTO boards (id, name, parent_id, depth, nodes, connections, updated_at) 
			VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
			ON CONFLICT (id) DO UPDATE SET 
				name = EXCLUDED.name, 
				parent_id = EXCLUDED.parent_id,
				depth = EXCLUDED.depth,
				nodes = EXCLUDED.nodes, 
				connections = EXCLUDED.connections, 
				updated_at = EXCLUDED.updated_at
		`, [
			id, 
			payload.name || `board_${id.slice(0,6)}`, 
			payload.parentId || null,
			payload.depth || 0,
			JSON.stringify(payload.nodes || []), 
			JSON.stringify(payload.connections || []), 
			new Date().toISOString()
		]);
		
		return json({ success: true });
	} catch (error) {
		console.error("PUT board error:", error);
		return json({ error: "Failed to save board" }, { status: 500 });
	}
}
