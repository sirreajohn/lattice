import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

export let db = null;
let isDbInitialized = false;
let initializationPromise = null;

export async function initDb() {
	if (isDbInitialized) return;
	if (initializationPromise) return initializationPromise;
	
	initializationPromise = (async () => {
		try {
			console.time('pglite-init');

			if (!fs.existsSync('./data')) {
				fs.mkdirSync('./data', { recursive: true });
			}

			// Skip the vector extension — it loads a massive WASM binary
			// that can take 60+ seconds on low-resource servers, causing 524s.
			db = new PGlite('./data/lattice-db');
			
			await db.waitReady;
			console.timeEnd('pglite-init');

			console.time('pglite-schema');
			await db.exec(`
				CREATE TABLE IF NOT EXISTS boards (
					id TEXT PRIMARY KEY,
					name TEXT,
					parent_id TEXT,
					depth INTEGER DEFAULT 0,
					nodes JSONB,
					connections JSONB,
					updated_at TIMESTAMP
				);

				CREATE TABLE IF NOT EXISTS users (
					id TEXT PRIMARY KEY,
					username TEXT UNIQUE,
					password_hash TEXT
				);

				CREATE TABLE IF NOT EXISTS sessions (
					token TEXT PRIMARY KEY,
					user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
					expires_at TIMESTAMP
				);
			`);

			// Patch columns individually (PGlite can crash with multiple ALTERs in one exec)
			const patches = [
				`ALTER TABLE boards ADD COLUMN IF NOT EXISTS parent_id TEXT;`,
				`ALTER TABLE boards ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;`,
				`ALTER TABLE boards ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;`,
				`ALTER TABLE boards ADD COLUMN IF NOT EXISTS drawings JSONB DEFAULT '[]'::jsonb;`
			];

			for (const patch of patches) {
				try {
					await db.query(patch);
				} catch (e) {
					if (e instanceof Error && !e.message.includes('already exists')) throw e;
				}
			}

			console.timeEnd('pglite-schema');
			isDbInitialized = true;
			console.log('PGlite ready');
		} catch (error) {
			console.error("Failed to initialize Server PGlite:", error);
			initializationPromise = null;
			throw error;
		}
	})();

	return initializationPromise;
}

// Eagerly start initialization at module load so it happens during server boot,
// not on the first user request (which would cause a Cloudflare 524 timeout).
initDb().catch(() => {});
