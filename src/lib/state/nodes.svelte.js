import { env } from '$env/dynamic/public';
import { db, initDb } from '$lib/db.js';

const DEBOUNCE_MS = parseInt(env.PUBLIC_DEBOUNCE_TIMEOUT_MS || '5000', 10);
const MAX_CARDS = parseInt(env.PUBLIC_MAX_CARDS_PER_BOARD || '500', 10);

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

export class NodesState {
	// Array of nodes: { id, type, x, y, width, height, data }
	nodes = $state([]);
	// Array of connections: { id, from: nodeId, to: nodeId }
	connections = $state([]);

	// Draft connection for drawing lines
	draftConnection = $state(null);

	// Selected node id
	selectedNodeId = $state(null);
	boardId = '';

	constructor(boardId = 'default') {
		this.boardId = boardId;
		if (typeof window !== 'undefined') {
			initDb().then(() => this.loadFromStorage());
		}
	}

	addNode(type, x, y, data = {}) {
		if (this.nodes.length >= MAX_CARDS) {
			alert(`Board limit reached: maximum of ${MAX_CARDS} cards allowed.`);
			return null;
		}
		const id = crypto.randomUUID();
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

	async loadFromStorage() {
		try {
			if (typeof window !== 'undefined') {
				const res = await db.query('SELECT * FROM boards WHERE id = $1', [this.boardId]);
				let localData = res.rows.length > 0 ? res.rows[0] : null;

				if (localData) {
					if (localData.nodes) this.nodes = localData.nodes;
					if (localData.connections) this.connections = localData.connections;
					globalMetadata.setName(this.boardId, localData.name || `board_${this.boardId.slice(0,6)}`);
				}
			}
		} catch (e) {
			console.error("Failed to load lattice state:", e);
		}
	}

	saveToStorage = debounce(async () => {
		try {
			if (typeof window !== 'undefined') {
				await db.query(`
					INSERT INTO boards (id, name, nodes, connections, updated_at) 
					VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
					ON CONFLICT (id) DO UPDATE SET 
						name = EXCLUDED.name, 
						nodes = EXCLUDED.nodes, 
						connections = EXCLUDED.connections, 
						updated_at = EXCLUDED.updated_at
				`, [
					this.boardId, 
					globalMetadata.getName(this.boardId), 
					JSON.stringify(this.nodes), 
					JSON.stringify(this.connections), 
					new Date().toISOString()
				]);
			}
		} catch (e) {
			console.error("Failed to save lattice state:", e);
		}
	}, DEBOUNCE_MS);
}

export const nodesState = new NodesState();

export class GlobalMetadata {
	boardNames = $state({});

	constructor() {
		if (typeof window !== 'undefined') {
			this.boardNames = JSON.parse(localStorage.getItem('lattice-board-names') || '{}');
		}
	}

	setName(id, name) {
		this.boardNames[id] = name;
		if (typeof window !== 'undefined') {
			localStorage.setItem('lattice-board-names', JSON.stringify(this.boardNames));
		}
	}

	getName(id) {
		return this.boardNames[id] || `board_${id.slice(0,6)}`;
	}
}

export const globalMetadata = new GlobalMetadata();
