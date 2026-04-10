import { json } from '@sveltejs/kit';
import { db, initDb } from '$lib/server/db.js';
import { env } from '$env/dynamic/public';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function GET({ params, url, locals }) {
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
			SELECT id, name FROM lineage WHERE id != $2 AND id != 'default' ORDER BY level DESC
		`, [lineageId, lineageFilter]);

		if (res.rows.length > 0) {
			const board = res.rows[0];

			// Ownership Check & Auto-Claiming logic for unassigned legacy boards
			if (locals.user && env.PUBLIC_DB_MODE !== 'temp') {
				if (board.user_id === null) {
					await db.query('UPDATE boards SET user_id = $1 WHERE id = $2', [locals.user.id, id]);
					board.user_id = locals.user.id;
				} else if (board.user_id !== locals.user.id) {
					return json({ error: "Unauthorized access to board" }, { status: 403 });
				}
			}

			board.lineage = lineageRes.rows;

			// Fetch names for all child boards shown on this canvas to ensure titles are synced
			const childBoardIds = (board.nodes || [])
				.filter(node => node.type === 'board')
				.map(node => node.id);

			if (childBoardIds.length > 0) {
				const childRes = await db.query('SELECT id, name FROM boards WHERE id = ANY($1)', [childBoardIds]);
				board.childMetadata = childRes.rows.reduce((acc, row) => {
					acc[row.id] = row.name;
					return acc;
				}, {});
			} else {
				board.childMetadata = {};
			}

			return json(board);
		}
		// Return empty scaffold if new board
		return json({ id, name: null, parentId: parentIdParam, depth: 0, nodes: [], connections: [], lineage: lineageRes.rows, childMetadata: {} });
	} catch (error) {
		console.error("GET board error:", error);
		return json({ error: "Failed to load board" }, { status: 500 });
	}
}

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function PUT({ params, request, locals }) {
	const { id } = params;
	await initDb();
	
	try {
		const payload = await request.json();

		// Prevent updating boards that belong to another user
		if (locals.user && env.PUBLIC_DB_MODE !== 'temp') {
			const checkRes = await db.query('SELECT user_id FROM boards WHERE id = $1', [id]);
			if (checkRes.rows.length > 0 && checkRes.rows[0].user_id !== null && checkRes.rows[0].user_id !== locals.user.id) {
				return json({ error: "Unauthorized modification" }, { status: 403 });
			}
		}
		
		await db.query(`
			INSERT INTO boards (id, name, parent_id, depth, nodes, connections, drawings, user_id, updated_at) 
			VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
			ON CONFLICT (id) DO UPDATE SET 
				name = EXCLUDED.name, 
				parent_id = EXCLUDED.parent_id,
				depth = EXCLUDED.depth,
				nodes = EXCLUDED.nodes, 
				connections = EXCLUDED.connections, 
				drawings = EXCLUDED.drawings,
				user_id = COALESCE(boards.user_id, EXCLUDED.user_id),
				updated_at = EXCLUDED.updated_at
		`, [
			id, 
			payload.name || `board_${id.slice(0,6)}`, 
			payload.parentId || null,
			payload.depth || 0,
			JSON.stringify(payload.nodes || []), 
			JSON.stringify(payload.connections || []), 
			JSON.stringify(payload.drawings || []),
			locals.user ? locals.user.id : null,
			new Date().toISOString()
		]);
		
		return json({ success: true });
	} catch (error) {
		console.error("PUT board error:", error);
		return json({ error: "Failed to save board" }, { status: 500 });
	}
}

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function DELETE({ params, locals }) {
	const { id } = params;
	if (id === 'default' || id.startsWith('root_')) {
		return json({ error: "Cannot delete root home boards" }, { status: 400 });
	}

	await initDb();
	try {
        // @ts-ignore
		if (locals.user && env.PUBLIC_DB_MODE !== 'temp') {
			const checkRes = await db.query('SELECT user_id FROM boards WHERE id = $1', [id]);
			if (checkRes.rows.length > 0 && checkRes.rows[0].user_id !== null && checkRes.rows[0].user_id !== locals.user.id) {
				return json({ error: "Unauthorized modification" }, { status: 403 });
			}
		}

		await db.query('DELETE FROM boards WHERE id = $1', [id]);
		return json({ success: true });
	} catch (error) {
		console.error("DELETE board error:", error);
		return json({ error: "Failed to delete board" }, { status: 500 });
	}
}
