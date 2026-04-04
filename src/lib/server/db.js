import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import fs from 'fs';

export let db = null;
let isDbInitialized = false;

export async function initDb() {
	if (isDbInitialized) return;
	
	try {
		// Ensure the data directory exists before PGlite tries to mount itself
		if (!fs.existsSync('./data')) {
			fs.mkdirSync('./data', { recursive: true });
		}

		// Server-side execution only! 
		db = new PGlite('./data/lattice-db', {
			extensions: { vector }
		});
        
        // Ensure PGlite is actually ready before executing
        await db.waitReady;

		await db.exec(`
			CREATE EXTENSION IF NOT EXISTS vector;
		
			CREATE TABLE IF NOT EXISTS boards (
				id TEXT PRIMARY KEY,
				name TEXT,
				parent_id TEXT,
				depth INTEGER DEFAULT 0,
				nodes JSONB,
				connections JSONB,
				updated_at TIMESTAMP
			);
		`);

		// Automatically patch old tables seamlessly without data purging!
		await db.query(`
			ALTER TABLE boards ADD COLUMN IF NOT EXISTS parent_id TEXT;
			ALTER TABLE boards ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;
		`);

		isDbInitialized = true;
	} catch (error) {
		console.error("Failed to initialize Server PGlite:", error);
	}
}
