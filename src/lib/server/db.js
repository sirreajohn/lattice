import pkg from 'pg';
const { Pool } = pkg;
import { env } from '$env/dynamic/private';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

export let db = null;
export let dbType = 'unknown'; // 'postgres', 'pglite', or 'unknown'
let isDbInitialized = false;
let initializationPromise = null;

export async function initDb() {
	if (isDbInitialized) return;
	if (initializationPromise) return initializationPromise;
	
	initializationPromise = (async () => {
		try {
			const connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
			
			if (connectionString) {
				console.time('postgres-init');
				db = new Pool({ connectionString });
				await db.query('SELECT 1');
				dbType = 'postgres';
				console.timeEnd('postgres-init');
			} else {
				console.time('pglite-init');
				if (!fs.existsSync('./data')) {
					fs.mkdirSync('./data', { recursive: true });
				}
				db = new PGlite('./data/lattice-db');
				await db.waitReady;
				dbType = 'pglite';
				console.timeEnd('pglite-init');
			}

			console.time('db-schema');
			const schema = `
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
			`;
			
			if (connectionString) {
				await db.query(schema);
			} else {
				await db.exec(schema);
			}

			// Patch columns
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
					if (connectionString) {
						if (e.code !== '42701') throw e; 
					} else {
						if (e instanceof Error && !e.message.includes('already exists')) throw e;
					}
				}
			}

			console.timeEnd('db-schema');
			isDbInitialized = true;
			console.log(connectionString ? 'PostgreSQL (pg) ready' : 'PGlite ready');
		} catch (error) {
			console.error("Failed to initialize Server PostgreSQL:", error);
			initializationPromise = null;
			throw error;
		}
	})();

	return initializationPromise;
}

// Eagerly start initialization - removed to avoid build errors when DB is offline
// initDb().catch(() => {});

