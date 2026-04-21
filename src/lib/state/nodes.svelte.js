import { env } from '$env/dynamic/public';
import { canvasState } from './canvas.svelte.js';
import { initLocalDb } from './db.client.js';

const DEBOUNCE_MS = parseInt(env.PUBLIC_DB_SAVE_DELAY_MS || '5000', 10);
const MAX_CARDS = parseInt(env.PUBLIC_MAX_CARDS_PER_BOARD || '500', 10);
const MAX_RECURSIVE_BOARDS = parseInt(env.PUBLIC_MAX_RECURSIVE_BOARDS || '10', 10);
const DB_MODE = env.PUBLIC_DB_MODE || 'local'; // 'local' or 'temp'

function debounce(func, wait) {
	let timeout;
	const debounced = function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
	debounced.cancel = () => clearTimeout(timeout);
	return debounced;
}

export class NodesState {
	// Array of nodes: { id, type, x, y, width, height, data }
	nodes = $state([]);
	// Array of connections: { id, from: nodeId, to: nodeId }
	connections = $state([]);

	// Board Hierarchy Navigation Tracking
	parentId = $state(null);
	depth = $state(0);
	lineage = $state([]); // Array of {id, name} ancestors

	// Freeform Drawing State
	drawings = $state([]);
	textAnnotations = $state([]);
	activeTool = $state('pointer'); // 'pointer', 'pencil', 'eraser', 'text'
	drawingColor = $state('var(--color-text-primary)');
	drawingWidth = $state(3);

	// Ephemeral board storage to preserve simulated database state when routing client-side in temp mode
	_tempCache = new Map();

	// Guards against stale async loadFromStorage calls overwriting current board state
	_loadGeneration = 0;
	/** @type {Promise<void> | null} */
	_savePending = null;

	// Draft connection for drawing lines
	draftConnection = $state(null);

	// Selected node id
	selectedNodeId = $state(null);
	boardId = '';

	constructor(boardId = '') {
		this.boardId = boardId;
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
			window.addEventListener('beforeunload', () => {
				this.forceSave();
			});
		}
	}

	addDrawing(drawing) {
		this.drawings.push(drawing);
		this.saveToStorage();
	}

	removeDrawing(id) {
		this.drawings = this.drawings.filter(d => d.id !== id);
		this.saveToStorage();
	}

	addTextAnnotation(annotation) {
		this.textAnnotations.push(annotation);
		this.saveToStorage();
	}

	updateTextAnnotation(id, data) {
		const t = this.textAnnotations.find(t => t.id === id);
		if (t) {
			Object.assign(t, data);
			this.saveToStorage();
		}
	}

	removeTextAnnotation(id) {
		this.textAnnotations = this.textAnnotations.filter(t => t.id !== id);
		this.saveToStorage();
	}

	addNode(type, x, y, data = {}, forcedId = null) {
		if (this.nodes.length >= MAX_CARDS) {
			alert(`Board limit reached: maximum of ${MAX_CARDS} cards allowed.`);
			return null;
		}
		const id = forcedId || crypto.randomUUID();
		this.nodes.push({ id, type, x, y, parentId: null, width: 250, height: "auto", data });
		this.saveToStorage();
		return id;
	}

	updateNodePosition(id, x, y) {
		const node = this.nodes.find(n => n.id === id);
		if (node) {
			node.x = x;
			node.y = y;
			this.saveToStorage();
		}
	}

	updateNodeData(id, data) {
		const node = this.nodes.find(n => n.id === id);
		if (node) {
			node.data = { ...node.data, ...data };
			this.saveToStorage();
		}
	}

	updateNodeParent(id, parentId) {
		const node = this.nodes.find(n => n.id === id);
		if (node) {
			node.parentId = parentId;

			// Remove any existing direct connections between this node and its new parent deck
			if (parentId) {
				this.connections = this.connections.filter(c =>
					!(c.from === id && c.to === parentId) &&
					!(c.to === id && c.from === parentId)
				);
			}

			this.saveToStorage();
		}
	}

	removeNode(id) {
		this.nodes = this.nodes.filter(n => n.id !== id);
		this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
		if (this.selectedNodeId === id) this.selectedNodeId = null;
		this.saveToStorage();
	}

	addConnection(fromId, fromPort, toId, toPort) {
		const fromNode = this.nodes.find(n => n.id === fromId);
		const toNode = this.nodes.find(n => n.id === toId);

		// Prevent connections between a deck and its direct children
		if (fromNode?.parentId === toId || toNode?.parentId === fromId) return;

		// Force max 1 wire per specific port socket to prevent spaghetti limits
		if (this.connections.some(c =>
			(c.from === fromId && c.fromPort === fromPort) ||
			(c.to === fromId && c.toPort === fromPort) ||
			(c.from === toId && c.fromPort === toPort) ||
			(c.to === toId && c.toPort === toPort)
		)) return;

		this.connections.push({ id: crypto.randomUUID(), from: fromId, fromPort, to: toId, toPort });
		this.saveToStorage();
	}

	removeConnection(id) {
		this.connections = this.connections.filter(c => c.id !== id);
		this.saveToStorage();
	}

	updateConnectionLabel(id, label) {
		const conn = this.connections.find(c => c.id === id);
		if (conn) {
			conn.label = label;
			this.saveToStorage();
		}
	}

	async loadFromStorage(seedParentId = null, seedDepth = 0) {
		const loadGen = ++this._loadGeneration;
		const targetBoardId = this.boardId;

		// Wait for any in-flight save to flush before reading, to avoid reading stale PGlite state
		if (this._savePending) {
			try { await this._savePending; } catch (_) { /* ignore */ }
			if (this._loadGeneration !== loadGen) return; // Bail if superseded during wait
		}

		try {
			if (typeof window !== 'undefined') {
				// Reset current board state to prevent leakage from previous board
				this.nodes = [];
				this.connections = [];
				this.drawings = [];
				this.textAnnotations = [];

				if (DB_MODE === 'temp') {
					if (this._tempCache.has(targetBoardId)) {
						const cached = this._tempCache.get(targetBoardId);
						this.nodes = JSON.parse(JSON.stringify(cached.nodes));
						this.connections = JSON.parse(JSON.stringify(cached.connections));
						this.drawings = JSON.parse(JSON.stringify(cached.drawings || []));
						this.textAnnotations = JSON.parse(JSON.stringify(cached.textAnnotations || []));
						this.parentId = cached.parentId || seedParentId || null;
						this.depth = cached.depth || seedDepth || 0;
						this.lineage = this._computeTempLineage(targetBoardId);
						
						if (seedParentId && !cached.parentId) this.saveToStorage();
					} else {
						this.parentId = seedParentId;
						this.depth = seedDepth;
						this.lineage = this._computeTempLineage(targetBoardId);
						if (seedParentId) this.saveToStorage();
					}
					return;
				}

				const localDb = await initLocalDb();
				if (this._loadGeneration !== loadGen) return;

				// Rest Sync Pipeline (Read Path)
				// Fetch canonical state from the upstream server and hydrate local DB if the server is newer.
				try {
					const response = await fetch(`/api/boards/${targetBoardId}`);
					if (this._loadGeneration !== loadGen) return;

					if (response.ok) {
						const serverBoard = await response.json();
						if (this._loadGeneration !== loadGen) return;

						const checkRes = await localDb.query('SELECT updated_at FROM boards WHERE id = $1', [targetBoardId]);
						if (this._loadGeneration !== loadGen) return;

						const localDate = checkRes.rows.length > 0 && checkRes.rows[0].updated_at 
							? new Date(checkRes.rows[0].updated_at).getTime() 
							: 0;
						
						const serverDate = serverBoard.updated_at 
							? new Date(serverBoard.updated_at).getTime() 
							: 0;

						// If server is strictly newer, blindly copy it into PGlite to hydrate optimistic state
						if (serverDate > localDate) {
							await localDb.query(`
								INSERT INTO boards (id, name, parent_id, depth, nodes, connections, drawings, text_annotations, updated_at)
								VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
								ON CONFLICT (id) DO UPDATE SET
									name = EXCLUDED.name,
									parent_id = EXCLUDED.parent_id,
									depth = EXCLUDED.depth,
									nodes = EXCLUDED.nodes,
									connections = EXCLUDED.connections,
									drawings = EXCLUDED.drawings,
									text_annotations = EXCLUDED.text_annotations,
									updated_at = EXCLUDED.updated_at;
							`, [
								serverBoard.id,
								serverBoard.name,
								serverBoard.parent_id || serverBoard.parentId || null,
								serverBoard.depth || 0,
								JSON.stringify(serverBoard.nodes || []),
								JSON.stringify(serverBoard.connections || []),
								JSON.stringify(serverBoard.drawings || []),
								JSON.stringify(serverBoard.textAnnotations || []),
								serverBoard.updated_at || new Date().toISOString()
							]);
							if (this._loadGeneration !== loadGen) return;
						}
					}
				} catch (e) {
					console.warn("Failed to ping upstream server. Operating in pure offline mode.", e);
				}

				if (this._loadGeneration !== loadGen) return;

				const res = await localDb.query('SELECT * FROM boards WHERE id = $1', [targetBoardId]);
				if (this._loadGeneration !== loadGen) return;

				if (res.rows.length > 0) {
					const localData = res.rows[0];
					if (localData.nodes) this.nodes = typeof localData.nodes === 'string' ? JSON.parse(localData.nodes) : localData.nodes;
					if (localData.connections) this.connections = typeof localData.connections === 'string' ? JSON.parse(localData.connections) : localData.connections;
					if (localData.drawings) this.drawings = typeof localData.drawings === 'string' ? JSON.parse(localData.drawings) : localData.drawings;
					if (localData.text_annotations) this.textAnnotations = typeof localData.text_annotations === 'string' ? JSON.parse(localData.text_annotations) : localData.text_annotations;
					this.parentId = localData.parent_id ?? seedParentId;
					this.depth = localData.depth !== undefined && localData.depth !== 0 ? localData.depth : seedDepth;
					
					// Reconstruct lineage recursively straight from the local DB!
					const lineageRes = await localDb.query(`
						WITH RECURSIVE lineage AS (
							SELECT id, name, parent_id, depth FROM boards WHERE id = $1
							UNION
							SELECT b.id, b.name, b.parent_id, b.depth FROM boards b
							INNER JOIN lineage l ON l.parent_id = b.id
						)
						SELECT id, COALESCE(name, 'board_' || substr(id, 1, 6)) as name FROM lineage WHERE id != $1 ORDER BY depth ASC;
					`, [targetBoardId]);
					if (this._loadGeneration !== loadGen) return;
					
					this.lineage = lineageRes.rows;
					
					// Seed global metadata
					this.lineage.forEach(ancestor => {
						globalMetadata.setName(ancestor.id, ancestor.name);
					});
					
					if (localData.name) {
						globalMetadata.setName(targetBoardId, localData.name);
					}
					
					if (seedParentId && !localData.parent_id) this.saveToStorage();
				} else {
					// Blank board initialized locally
					this.parentId = seedParentId;
					this.depth = seedDepth;
					if (seedParentId) this.saveToStorage();
				}
			}
		} catch (e) {
			console.error("Failed to load local DB state:", e);
		}
	}

	async _saveInternal() {
		// purely synchronous snaphot...
		const snapBoardId = this.boardId;
		const snapParentId = this.parentId;
		const snapDepth = this.depth;
		
		// Force deep clone to sever all proxy bonds synchronously.
		const snapNodes = JSON.stringify($state.snapshot(this.nodes));
		const snapConnections = JSON.stringify($state.snapshot(this.connections));
		const snapDrawings = JSON.stringify($state.snapshot(this.drawings));
		const snapTextAnnotations = JSON.stringify($state.snapshot(this.textAnnotations));
		const snapName = globalMetadata.getName(this.boardId);
		
		// Guard: Don't save if board ID is missing, or if it's the default board and it's completely empty.
		if (!snapBoardId) return;
		if (snapBoardId === 'default' && this.nodes.length === 0 && this.drawings.length === 0) {
			console.log(`[SYNC SKIP] Skipping empty default board.`);
			return;
		}

		console.log(`[SYNC RUN] Generating payload for board: ${snapBoardId} | Nodes Count: ${this.nodes.length} | Snapshot Size: ${snapNodes.length}`);

		try {
			if (typeof window !== 'undefined') {
				if (DB_MODE === 'temp') {
					this._tempCache.set(snapBoardId, {
						parentId: snapParentId,
						depth: snapDepth,
						nodes: JSON.parse(snapNodes),
						connections: JSON.parse(snapConnections),
						drawings: JSON.parse(snapDrawings),
						textAnnotations: JSON.parse(snapTextAnnotations)
					});
					return;
				}

				const localDb = await initLocalDb();
				
				// Standard explicit Upsert syntax for PostgreSQL/PGlite
				await localDb.query(`
					INSERT INTO boards (id, name, parent_id, depth, nodes, connections, drawings, text_annotations, updated_at)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
					ON CONFLICT (id) DO UPDATE SET
						name = EXCLUDED.name,
						parent_id = EXCLUDED.parent_id,
						depth = EXCLUDED.depth,
						nodes = EXCLUDED.nodes,
						connections = EXCLUDED.connections,
						drawings = EXCLUDED.drawings,
						text_annotations = EXCLUDED.text_annotations,
						updated_at = NOW();
				`, [
					snapBoardId,
					snapName,
					snapParentId,
					snapDepth,
					snapNodes,
					snapConnections,
					snapDrawings,
					JSON.stringify(this.textAnnotations)
				]);
				
				// Queue background write to authoritative Postgres server
				// PGlite sync extension handles Downstream (Server -> Local) state cleanly, but Upstream changes
				// must be submitted through standard application API endpoints.
				fetch(`/api/boards/${snapBoardId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: snapName,
						parentId: snapParentId,
						depth: snapDepth,
						nodes: JSON.parse(snapNodes),
						connections: JSON.parse(snapConnections),
						drawings: JSON.parse(snapDrawings),
						textAnnotations: this.textAnnotations
					})
				}).catch(e => console.warn('Background sync to upstream server failed (offline mode fallback engaged)', e));
			}
		} catch (e) {
			console.error("Failed to save local DB state:", e);
		}
	}

	forceSave() {
		if (this.saveToStorage && typeof this.saveToStorage.cancel === 'function') {
			this.saveToStorage.cancel();
		}
		this._savePending = this._saveInternal();
		return this._savePending;
	}

	saveToStorage = debounce(() => this._saveInternal(), DEBOUNCE_MS);

	get maxDepth() {
		return MAX_RECURSIVE_BOARDS;
	}

	_computeTempLineage(boardId) {
		const path = [];
		let currentId = boardId;
		const visited = new Set(); // Prevent infinite recursion in case of cycles

		while (currentId && currentId !== 'default' && !visited.has(currentId)) {
			visited.add(currentId);
			const board = this._tempCache.get(currentId);
			const parent = board?.parentId;
			
			if (parent && parent !== 'default') {
				path.unshift({ id: parent, name: globalMetadata.getName(parent) });
				currentId = parent;
			} else {
				break;
			}
		}
		return path;
	}

	/**
	 * Returns all boards currently known to the session (cache + active)
	 * Useful for "Board Management" in temp mode.
	 */
	getKnownBoards() {
		const boards = [];
		for (const [id, data] of this._tempCache.entries()) {
			boards.push({
				id,
				name: globalMetadata.getName(id),
				updated_at: new Date().toISOString() // Temp mode doesn't track timestamps strictly
			});
		}
		// Also include current board if not in cache yet
		if (this.boardId && !this._tempCache.has(this.boardId)) {
			boards.push({
				id: this.boardId,
				name: globalMetadata.getName(this.boardId),
				updated_at: new Date().toISOString()
			});
		}
		return boards;
	}

	getCenter() {
		if (typeof window === 'undefined') return { x: 0, y: 0 };
		const screenCenter = {
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
		};
		return canvasState.screenToCanvas(screenCenter.x, screenCenter.y);
	}

	addNote() {
		const center = this.getCenter();
		this.addNode("note", center.x - 125, center.y - 75, { text: "" });
	}

	addBoard() {
		const center = this.getCenter();
		this.addNode("board", center.x - 125, center.y - 75, { title: "" });
	}

	addColumn() {
		const center = this.getCenter();
		this.addNode("column", center.x - 125, center.y - 75, { title: "" });
	}

	addImage() {
		const center = this.getCenter();
		const id = this.addNode("image", center.x - 125, center.y - 125, { src: "", alt: "" });
		const node = this.nodes.find((n) => n.id === id);
		if (node) {
			node.width = 250;
			node.height = 250;
			this.saveToStorage();
		}
	}

	addVideo() {
		const center = this.getCenter();
		const id = this.addNode("video", center.x - 160, center.y - 90, { url: "" });
		const node = this.nodes.find((n) => n.id === id);
		if (node) {
			node.width = 320;
			node.height = 180;
			this.saveToStorage();
		}
	}

	addDocs() {
		const center = this.getCenter();
		const id = this.addNode("docs", center.x - 250, center.y - 300, { type: "html", content: "" });
		const node = this.nodes.find((n) => n.id === id);
		if (node) {
			node.width = 500;
			node.height = 600;
			this.saveToStorage();
		}
	}

	addFrame() {
		const center = this.getCenter();
		const id = this.addNode("frame", center.x - 300, center.y - 200, { title: "Overlay Group", color: "emerald" });
		const node = this.nodes.find((n) => n.id === id);
		if (node) {
			node.width = 600;
			node.height = 400;
			this.saveToStorage();
		}
	}

	addSpreadsheet() {
		const center = this.getCenter();
		const emptySheet = {
			sheets: { Sheet1: Array.from({ length: 10 }, () => Array(6).fill("")) },
			sheetNames: ["Sheet1"],
			activeSheet: 0,
		};
		const id = this.addNode("sheet", center.x - 275, center.y - 200, { type: "spreadsheet", content: emptySheet });
		const node = this.nodes.find((n) => n.id === id);
		if (node) {
			node.width = 550;
			node.height = 400;
			this.saveToStorage();
		}
	}

	exportState(boardIds = null) {
		// Flush current active state to cache
		this.forceSave();

		const boardsToExport = new Set();
		if (boardIds && boardIds.length > 0) {
			// Initialize set with requested boards
			for (const id of boardIds) {
				if (this._tempCache.has(id)) {
					boardsToExport.add(id);
				}
			}
			
			// Recursively add children
			let addedNew = true;
			while (addedNew) {
				addedNew = false;
				for (const [id, data] of this._tempCache.entries()) {
					if (!boardsToExport.has(id) && data.parentId && boardsToExport.has(data.parentId)) {
						boardsToExport.add(id);
						addedNew = true;
					}
				}
			}
		} else {
			// Export all boards if no filter
			for (const id of this._tempCache.keys()) {
				boardsToExport.add(id);
			}
		}

		const boards = [];
		for (const id of boardsToExport) {
			const data = this._tempCache.get(id);
			boards.push({
				id,
				name: globalMetadata.getName(id),
				parent_id: data.parentId,
				depth: data.depth,
				nodes: data.nodes,
				connections: data.connections,
				drawings: data.drawings,
				textAnnotations: data.textAnnotations || []
			});
		}

		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			boards
		};
	}

	importState(payload) {
		if (!payload.boards || !Array.isArray(payload.boards)) return false;

		// Clear current session
		this._tempCache.clear();

		// Populate cache
		for (const board of payload.boards) {
			this._tempCache.set(board.id, {
				parentId: board.parent_id,
				depth: board.depth || 0,
				nodes: board.nodes || [],
				connections: board.connections || [],
				drawings: board.drawings || [],
				textAnnotations: board.textAnnotations || []
			});
			if (board.name) globalMetadata.setName(board.id, board.name);
		}

		// Reload current board if possible
		this.loadFromStorage();
		return true;
	}
}

export const nodesState = new NodesState();

export class GlobalMetadata {
	boardNames = $state({});

	constructor() {
		if (typeof window !== 'undefined') {
			if (DB_MODE !== 'temp') {
				this.boardNames = JSON.parse(localStorage.getItem('lattice-board-names') || '{}');
			}
		}
	}

	setName(id, name) {
		this.boardNames[id] = name;
		if (typeof window !== 'undefined') {
			if (DB_MODE !== 'temp') {
				localStorage.setItem('lattice-board-names', JSON.stringify(this.boardNames));
			}
		}
	}

	getName(id) {
		if (id === 'default') return 'Default Board';
		return this.boardNames[id] || `board_${id.slice(0, 6)}`;
	}

	getAllNames() {
		return $state.snapshot(this.boardNames);
	}

	importNames(names) {
		Object.assign(this.boardNames, names);
	}
}

export const globalMetadata = new GlobalMetadata();
