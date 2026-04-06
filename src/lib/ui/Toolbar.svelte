<script>
	import { nodesState } from '$lib/state/nodes.svelte.js';
	import { canvasState } from '$lib/state/canvas.svelte.js';

	function addNote() {
		const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		const canvasCenter = canvasState.screenToCanvas(screenCenter.x, screenCenter.y);
		nodesState.addNode('note', canvasCenter.x - 125, canvasCenter.y - 75, { text: '' });
	}

	function addBoard() {
		const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		const canvasCenter = canvasState.screenToCanvas(screenCenter.x, screenCenter.y);
		nodesState.addNode('board', canvasCenter.x - 125, canvasCenter.y - 75, { title: '' });
	}

	function addDeck() {
		const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		const canvasCenter = canvasState.screenToCanvas(screenCenter.x, screenCenter.y);
		nodesState.addNode('column', canvasCenter.x - 125, canvasCenter.y - 75, { title: '' });
	}

	function addImage() {
		const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		const canvasCenter = canvasState.screenToCanvas(screenCenter.x, screenCenter.y);
		const id = nodesState.addNode('image', canvasCenter.x - 125, canvasCenter.y - 125, { src: '', alt: '' });
		const node = nodesState.nodes.find(n => n.id === id);
		if (node) {
			node.width = 250;
			node.height = 250;
			nodesState.saveToStorage();
		}
	}

	function addVideo() {
		const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		const canvasCenter = canvasState.screenToCanvas(screenCenter.x, screenCenter.y);
		const id = nodesState.addNode('video', canvasCenter.x - 160, canvasCenter.y - 90, { url: '' });
		
		// Force 16:9 standard widget dimension aspect ratio
		const node = nodesState.nodes.find(n => n.id === id);
		if (node) {
			node.width = 320;
			node.height = 180;
			nodesState.saveToStorage();
		}
	}

	function clearBoard() {
		if (confirm("Clear all items?")) {
			nodesState.nodes = [];
			nodesState.connections = [];
			nodesState.saveToStorage();
		}
	}
	import { themeState } from '$lib/state/theme.svelte.js';
</script>

<div class="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2 px-3 shadow-2xl flex gap-3 items-center z-50">
	<button 
		onclick={addNote}
		class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-[#000] border border-[var(--color-border)] text-white text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Note</span>
	</button>

	<button 
		onclick={addDeck}
		class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-[#000] border border-[var(--color-border)] text-white text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Deck</span>
	</button>

	<button 
		onclick={addBoard}
		class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-[#000] border border-[var(--color-border)] text-white text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Board</span>
	</button>

	<button 
		onclick={addVideo}
		class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 11 5 3-5 3v-6Z"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-[#000] border border-[var(--color-border)] text-white text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Video</span>
	</button>

	<button 
		onclick={addImage}
		class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-[#000] border border-[var(--color-border)] text-white text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Image</span>
	</button>

	<div class="h-5 w-px bg-[var(--color-border)] mx-1"></div>

	<button 
		onclick={clearBoard}
		class="group relative flex items-center justify-center w-8 h-8 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-red-950 border border-red-900 text-red-200 text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Clear All</span>
	</button>

	<!-- Settings -->
	<button 
		onclick={() => themeState.isOpen = true}
		class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
		<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-[#000] border border-[var(--color-border)] text-white text-[10px] uppercase font-bold tracking-wider rounded px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity">Settings</span>
	</button>
</div>
