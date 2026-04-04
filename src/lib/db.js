import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';

export let db = null;

// Ensures the database schema is perfectly bootstrapped before the UI renders.
let isDbInitialized = false;

export async function initDb() {
	if (isDbInitialized) return;
	
	try {
		if (typeof window !== 'undefined') {
			db = new PGlite('idb://lattice-db', {
				extensions: { vector }
			});
			
			await db.exec(`
				CREATE EXTENSION IF NOT EXISTS vector;
			
				CREATE TABLE IF NOT EXISTS boards (
					id TEXT PRIMARY KEY,
					name TEXT,
					nodes JSONB,
					connections JSONB,
					updated_at TIMESTAMP
				);
			`);
			isDbInitialized = true;
		}
	} catch (error) {
		console.error("Failed to initialize PGlite:", error);
	}
}
