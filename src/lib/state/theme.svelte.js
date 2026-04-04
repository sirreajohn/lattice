export const PRESETS = {
	default: {
		canvas: '#0a0a0a',
		surface: '#141414',
		border: '#262626',
		'text-primary': '#e5e5e5',
		'text-secondary': '#a3a3a3',
		accent: '#3b82f6',
		lines: '#3cde24'
	},
	dracula: {
		canvas: '#282a36',
		surface: '#44475a',
		border: '#6272a4',
		'text-primary': '#f8f8f2',
		'text-secondary': '#6272a4',
		accent: '#bd93f9',
		lines: '#50fa7b'
	},
	nord: {
		canvas: '#2e3440',
		surface: '#3b4252',
		border: '#4c566a',
		'text-primary': '#eceff4',
		'text-secondary': '#d8dee9',
		accent: '#88c0d0',
		lines: '#a3be8c'
	},
	monokai: {
		canvas: '#272822',
		surface: '#3e3d32',
		border: '#75715e',
		'text-primary': '#f8f8f2',
		'text-secondary': '#75715e',
		accent: '#f92672',
		lines: '#a6e22e'
	},
	solarized: {
		canvas: '#002b36',
		surface: '#073642',
		border: '#586e75',
		'text-primary': '#839496',
		'text-secondary': '#657b83',
		accent: '#268bd2',
		lines: '#859900'
	}
};

export class ThemeState {
	isOpen = $state(false);
	colors = $state({ ...PRESETS.default });
	currentPreset = $state('default');

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('lattice-theme');
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					if (parsed.colors) this.colors = parsed.colors;
					if (parsed.currentPreset) this.currentPreset = parsed.currentPreset;
				} catch (e) {
					console.error("Failed to parse theme:", e);
				}
			}

			// Auto inject globally on init & update
			$effect.root(() => {
				$effect(() => this.applyTheme(this.colors));
			});
		}
	}

	setColor(key, value) {
		this.colors[key] = value;
		this.currentPreset = 'custom';
		this.saveToStorage();
	}

	setPreset(presetId) {
		if (PRESETS[presetId]) {
			this.colors = { ...PRESETS[presetId] };
			this.currentPreset = presetId;
			this.saveToStorage();
		}
	}

	saveToStorage() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('lattice-theme', JSON.stringify({
				colors: this.colors,
				currentPreset: this.currentPreset
			}));
		}
	}

	applyTheme(colors) {
		if (typeof document === 'undefined') return;
		let styleEl = document.getElementById('lattice-dynamic-theme');
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'lattice-dynamic-theme';
			document.head.appendChild(styleEl);
		}

		const cssVars = Object.entries(colors)
			.map(([key, value]) => `--color-${key}: ${value} !important;`)
			.join('\n  ');

		styleEl.innerHTML = `:root {\n  ${cssVars}\n}`;
	}
}

export const themeState = new ThemeState();
