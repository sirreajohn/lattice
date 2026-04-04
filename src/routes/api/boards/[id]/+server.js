import { json } from '@sveltejs/kit';
import { db, initDb } from '$lib/server/db.js';

export async function GET({ params }) {
	const { id } = params;
	await initDb();
	
	try {
		const res = await db.query('SELECT * FROM boards WHERE id = $1', [id]);
		if (res.rows.length > 0) {
			return json(res.rows[0]);
		}
		// Return empty scaffold if new board
		return json({ id, name: `board_${id.slice(0,6)}`, nodes: [], connections: [] });
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
			INSERT INTO boards (id, name, nodes, connections, updated_at) 
			VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
			ON CONFLICT (id) DO UPDATE SET 
				name = EXCLUDED.name, 
				nodes = EXCLUDED.nodes, 
				connections = EXCLUDED.connections, 
				updated_at = EXCLUDED.updated_at
		`, [
			id, 
			payload.name || `board_${id.slice(0,6)}`, 
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
