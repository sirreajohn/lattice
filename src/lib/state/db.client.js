import { PGlite } from '@electric-sql/pglite';

// Global singleton
export let localDb = null;
let initializationPromise = null;

export async function initLocalDb() {
	if (localDb) return localDb;
	if (initializationPromise) return initializationPromise;

	initializationPromise = (async () => {
		try {
			console.log("Initializing Browser PGlite cache...");
			
			localDb = await PGlite.create({
				dataDir: 'idb://lattice-cache'
			});

			// We need a stable schema for offline mode before sync hits
			await localDb.exec(`
				CREATE TABLE IF NOT EXISTS boards (
					id TEXT PRIMARY KEY,
					name TEXT,
					parent_id TEXT,
					depth INTEGER DEFAULT 0,
					nodes JSONB,
					connections JSONB,
					user_id TEXT,
					drawings JSONB DEFAULT '[]'::jsonb,
					text_annotations JSONB DEFAULT '[]'::jsonb,
					updated_at TIMESTAMP
				);

				-- Migration for existing databases
				DO $$ 
				BEGIN 
					IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boards' AND column_name='text_annotations') THEN
						ALTER TABLE boards ADD COLUMN text_annotations JSONB DEFAULT '[]'::jsonb;
					END IF;
				END $$;
			`);

			console.log("Browser PGlite ready (Standalone mode)");
			
			return localDb;
		} catch (error) {
			console.error("Failed to initialize Browser PGlite:", error);
			initializationPromise = null;
			throw error;
		}
	})();

	return initializationPromise;
}
