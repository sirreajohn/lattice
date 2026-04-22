import pkg from 'pg';
const { Pool } = pkg;
import { env } from '$env/dynamic/private';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'postgres']);
const CLOUD_PROVIDERS = ['supabase.com', 'neon.tech', 'render.com'];

export let db = null;
export let dbType = 'unknown';
let _initPromise = null;

/** Resolve the connection string, remapping localhost → postgres inside Docker. */
function resolveConnectionString() {
	let url = env.DATABASE_URL || process.env.DATABASE_URL;
	if (url && fs.existsSync('/.dockerenv') && url.includes('@localhost')) {
		url = url.replace('@localhost', '@postgres');
	}
	return url;
}

/** Determine if SSL should be enabled based on the host or env flag. */
function needsSsl(url) {
	return CLOUD_PROVIDERS.some(p => url.includes(p)) || env.DATABASE_SSL === 'true';
}

/** Parse the hostname from a postgres URL. */
function parseHost(url) {
	try { return new URL(url).hostname; } catch { return 'unknown'; }
}

/** Connect to a real Postgres instance. */
async function connectPostgres(url) {
	db = new Pool({ connectionString: url, ssl: needsSsl(url) ? { rejectUnauthorized: false } : false });
	await db.query('SELECT 1');
	dbType = LOCAL_HOSTS.has(parseHost(url)) ? 'local' : 'cloud';
}

/** Fall back to an embedded PGlite instance. */
async function connectPglite() {
	fs.mkdirSync('./data', { recursive: true });
	db = new PGlite('./data/lattice-db');
	await db.waitReady;
	dbType = 'local-pglite';
}

/** Run schema creation. */
async function migrate(useQuery) {
	const exec = useQuery ? (s) => db.query(s) : (s) => db.exec(s);

	await exec(`
		CREATE TABLE IF NOT EXISTS boards (
			id TEXT PRIMARY KEY, name TEXT, parent_id TEXT,
			depth INTEGER DEFAULT 0, nodes JSONB, connections JSONB,
			user_id TEXT, drawings JSONB DEFAULT '[]'::jsonb, updated_at TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT
		);
		CREATE TABLE IF NOT EXISTS sessions (
			token TEXT PRIMARY KEY,
			user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
			expires_at TIMESTAMP
		);
	`);
}

// ── Public API ──────────────────────────────────────────────

export async function initDb() {
	if (db) return;
	if (_initPromise) return _initPromise;

	_initPromise = (async () => {
		try {
			const url = resolveConnectionString();

			if (url) {
				console.time('pg');
				await connectPostgres(url);
				console.timeEnd('pg');
			} else {
				console.time('pglite');
				await connectPglite();
				console.timeEnd('pglite');
			}

			console.time('migrate');
			await migrate(!!url);
			console.timeEnd('migrate');

			console.log(`DB ready → ${dbType}`);
		} catch (err) {
			console.error('DB init failed:', err);
			_initPromise = null;
			throw err;
		}
	})();

	return _initPromise;
}
