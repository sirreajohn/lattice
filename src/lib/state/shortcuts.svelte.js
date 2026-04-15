export class ShortcutsState {
	/** @type {Record<string, string | null>} */
	// Action -> Key mapping
	bindings = $state({
		// Tools
		'tool-pointer': '1',
		'tool-pencil': '2',
		'tool-eraser': '3',
		'tool-text': '4',
		// Cards
		'add-note': 'n',
		'add-board': 'b',
		'add-column': 'c',
		'add-image': 'i',
		'add-doc': 'd',
		'add-sheet': 's',
		'add-video': 'v',
		'add-frame': 'f',
	});

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('lattice-shortcuts');
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					this.bindings = { ...this.bindings, ...parsed };
				} catch (e) {
					console.error("Failed to parse shortcuts:", e);
				}
			}
		}
	}

	/** 
	 * @param {string} action 
	 * @param {string} key 
	 */
	setBinding(action, key) {
		// Prevent duplicates
		for (const k in this.bindings) {
			if (this.bindings[k] === key) {
				this.bindings[/** @type {string} */ (k)] = null;
			}
		}
		this.bindings[action] = key.toLowerCase();
		this.saveToStorage();
	}

	saveToStorage() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('lattice-shortcuts', JSON.stringify(this.bindings));
		}
	}

	/** @param {string} action */
	getLabel(action) {
		// @ts-ignore
		return this.bindings[action]?.toUpperCase() || '';
	}
}

export const shortcutsState = new ShortcutsState();
