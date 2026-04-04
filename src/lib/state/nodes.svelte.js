import { env } from '$env/dynamic/public';

const DEBOUNCE_MS = parseInt(env.PUBLIC_DB_SAVE_DELAY_MS || '5000', 10);
const MAX_CARDS = parseInt(env.PUBLIC_MAX_CARDS_PER_BOARD || '500', 10);
const MAX_RECURSIVE_BOARDS = parseInt(env.PUBLIC_MAX_RECURSIVE_BOARDS || '10', 10);
const DB_MODE = env.PUBLIC_DB_MODE || 'local'; // 'local' or 'temp'

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

	// Board Hierarchy Navigation Tracking
	parentId = $state(null);
	depth = $state(0);
	lineage = $state([]); // Array of {id, name} ancestors

	// Ephemeral board storage to preserve simulated database state when routing client-side in temp mode
	_tempCache = new Map();

	// Draft connection for drawing lines
	draftConnection = $state(null);

	// Selected node id
	selectedNodeId = $state(null);
	boardId = '';

	constructor(boardId = 'default') {
		this.boardId = boardId;
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
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

	async loadFromStorage(seedParentId = null, seedDepth = 0) {
		try {
			if (typeof window !== 'undefined') {
				if (DB_MODE === 'temp') {
					if (this._tempCache.has(this.boardId)) {
						const cached = this._tempCache.get(this.boardId);
						this.nodes = JSON.parse(JSON.stringify(cached.nodes));
						this.connections = JSON.parse(JSON.stringify(cached.connections));
						this.parentId = cached.parentId || seedParentId || null;
						this.depth = cached.depth || seedDepth || 0;
						this.lineage = this._computeTempLineage(this.boardId);
						
						if (seedParentId && !cached.parentId) this.saveToStorage();
					} else {
						this.parentId = seedParentId;
						this.depth = seedDepth;
						this.lineage = this._computeTempLineage(this.boardId);
						if (seedParentId) this.saveToStorage();
					}
					return;
				}

				const url = new URL(`/api/boards/${this.boardId}`, window.location.origin);
				if (seedParentId) url.searchParams.set('parent', seedParentId);

				const res = await fetch(url);
				if (!res.ok) throw new Error("Failed fetching board payload");

				let localData = await res.json();

				if (localData) {
					if (localData.nodes) this.nodes = localData.nodes;
					if (localData.connections) this.connections = localData.connections;
					this.parentId = localData.parent_id ?? seedParentId;
					this.depth = localData.depth !== undefined && localData.depth !== 0 ? localData.depth : seedDepth;
					this.lineage = localData.lineage || [];
					
					// Seed global metadata with lineage names to ensure breadcrumbs have labels
					this.lineage.forEach(ancestor => {
						globalMetadata.setName(ancestor.id, ancestor.name);
					});
					
					globalMetadata.setName(this.boardId, localData.name || `board_${this.boardId.slice(0, 6)}`);
					
					if (seedParentId && !localData.parent_id) this.saveToStorage();
				}
			}
		} catch (e) {
			console.error("Failed to load lattice state from server:", e);
		}
	}

	async _saveInternal() {
		try {
			if (typeof window !== 'undefined') {
				if (DB_MODE === 'temp') {
					this._tempCache.set(this.boardId, {
						parentId: this.parentId,
						depth: this.depth,
						nodes: JSON.parse(JSON.stringify(this.nodes)),
						connections: JSON.parse(JSON.stringify(this.connections))
					});
					return;
				}

				await fetch(`/api/boards/${this.boardId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: globalMetadata.getName(this.boardId),
						parentId: this.parentId,
						depth: this.depth,
						nodes: this.nodes,
						connections: this.connections
					})
				});
			}
		} catch (e) {
			console.error("Failed to save lattice state to server:", e);
		}
	}

	forceSave() {
		this._saveInternal();
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
		return this.boardNames[id] || `board_${id.slice(0, 6)}`;
	}
}

export const globalMetadata = new GlobalMetadata();
