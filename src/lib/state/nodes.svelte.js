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
		this.loadFromStorage();
	}

	addNode(type, x, y, data = {}) {
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

	loadFromStorage() {
		try {
			if (typeof window !== 'undefined') {
				const savedNodes = localStorage.getItem(`lattice-${this.boardId}-nodes`);
				const savedConnections = localStorage.getItem(`lattice-${this.boardId}-connections`);
				if (savedNodes) Object.assign(this.nodes, JSON.parse(savedNodes));
				if (savedConnections) Object.assign(this.connections, JSON.parse(savedConnections));
			}
		} catch (e) {
			console.error("Failed to load lattice state:", e);
		}
	}

	saveToStorage() {
		try {
			if (typeof window !== 'undefined') {
				localStorage.setItem(`lattice-${this.boardId}-nodes`, JSON.stringify(this.nodes));
				localStorage.setItem(`lattice-${this.boardId}-connections`, JSON.stringify(this.connections));
			}
		} catch (e) {
			console.error("Failed to save lattice state:", e);
		}
	}
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
