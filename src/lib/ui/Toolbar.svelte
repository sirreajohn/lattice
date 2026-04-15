<script>
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import { shortcutsState } from "$lib/state/shortcuts.svelte.js";
	import { themeState } from "$lib/state/theme.svelte.js";

	const DRAWING_COLORS = [
		"var(--color-text-primary)",
		"#ef4444",
		"#eab308",
		"#22c55e",
		"#3b82f6",
		"#d946ef",
	];
	const DRAWING_WIDTHS = [2, 5, 8, 14];

	/** @type {'office' | 'media' | null} */
	let activePill = $state(null);

	function togglePill(/** @type {'office' | 'media'} */ pill) {
		activePill = activePill === pill ? null : pill;
	}

	function clearBoard() {
		if (confirm("Clear all items?")) {
			nodesState.nodes = [];
			nodesState.connections = [];
			nodesState.drawings = [];
			nodesState.saveToStorage();
		}
	}
</script>

<!-- Click-out interception: if a pill is open, clicking anywhere else closes it -->
{#if activePill}
	<div
		class="fixed inset-0 z-49"
		onpointerdown={() => (activePill = null)}
		role="presentation"
	></div>
{/if}

<div
	class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50"
	onpointerdown={(e) => e.stopPropagation()}
	role="toolbar"
	aria-label="Main Toolbar"
	tabindex="0"
>
	<!-- Tools Section popovers -->
	{#if nodesState.activeTool === "pencil"}
		<div
			class="absolute bottom-full left-0 mb-3 bg-surface/90 backdrop-blur-md border-2 border-border py-2 px-3 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex gap-3 items-center rounded-none animate-in fade-in slide-in-from-bottom-2"
			onpointerdown={(e) => e.stopPropagation()}
			role="presentation"
		>
			<!-- Colors -->
			<div
				class="flex gap-1.5 border-r border-border pr-3"
			>
				{#each DRAWING_COLORS as color}
					<button
						class="w-5 h-5 rounded-none border border-white/20 transition-transform hover:scale-110 {nodesState.drawingColor ===
						color
							? 'ring-1 ring-offset-1 ring-offset-surface ring-text-primary scale-110'
							: ''}"
						style="background-color: {color};"
						onclick={() => (nodesState.drawingColor = color)}
						aria-label="Set color to {color}"
					></button>
				{/each}
			</div>
			<!-- Widths -->
			<div class="flex gap-2 items-center">
				{#each DRAWING_WIDTHS as w}
					<button
						class="w-6 h-6 rounded-none flex items-center justify-center hover:bg-text-primary/10 transition-colors {nodesState.drawingWidth ===
						w
							? 'bg-text-primary/10 ring-1 ring-accent'
							: ''}"
						onclick={() => (nodesState.drawingWidth = w)}
						aria-label="Set stroke width to {w}px"
					>
						<div
							class="rounded-none bg-text-primary"
							style="width: {w}px; height: {w}px;"
						></div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div
		class="bg-surface/90 backdrop-blur-md border border-border shadow-[0_0_30px_rgba(0,0,0,0.8)] flex gap-2 items-center p-1.5 rounded-none"
		onpointerdown={(e) => e.stopPropagation()}
		role="presentation"
	>
		<!-- Tools Section -->
		<!-- Tools Section -->
		<button
			onclick={() => (nodesState.activeTool = "pointer")}
			class="group relative flex items-center justify-center w-8 h-8 rounded-none transition-colors {nodesState.activeTool ===
			'pointer'
				? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]'
				: 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Select <span class="ml-1 opacity-50">[{shortcutsState.getLabel('tool-pointer')}]</span></span>
		</button>

		<button
			onclick={() => (nodesState.activeTool = "pencil")}
			class="group relative flex items-center justify-center w-8 h-8 rounded-none transition-colors {nodesState.activeTool ===
			'pencil'
				? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]'
				: 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Draw <span class="ml-1 opacity-50">[{shortcutsState.getLabel('tool-pencil')}]</span></span>
		</button>

		<button
				onclick={() => (nodesState.activeTool = "eraser")}
				class="group relative flex items-center justify-center w-8 h-8 rounded-none transition-colors {nodesState.activeTool ===
				'eraser'
					? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]'
				: 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
			>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Erase <span class="ml-1 opacity-50">[{shortcutsState.getLabel('tool-eraser')}]</span></span>
		</button>

		<button
			onclick={() => (nodesState.activeTool = "text")}
			class="group relative flex items-center justify-center w-8 h-8 rounded-none transition-colors {nodesState.activeTool ===
			'text'
				? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]'
				: 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Text <span class="ml-1 opacity-50">[{shortcutsState.getLabel('tool-text')}]</span></span>
		</button>

		<button
			onclick={() => nodesState.addFrame()}
			class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
			aria-label="Add Frame"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 8h16"/><path d="M8 4v16"/></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Frame <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-frame')}]</span></span>
		</button>

		<div class="h-5 w-px bg-text-primary/10 mx-1"></div>

		<!-- Nodes Section -->
		<button
			onclick={() => nodesState.addNote()}
			class="group relative flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-text-primary)]/10 rounded-none transition-colors"
			aria-label="Add Note"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Note <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-note')}]</span></span>
		</button>

		<!-- Office Group -->
		<div class="relative">
			<button
				onclick={() => togglePill("office")}
				class="group relative flex items-center justify-center w-8 h-8 rounded-none transition-colors {activePill === 'office' ? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
				<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Office</span>
			</button>

			{#if activePill === 'office'}
				<div 
					class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-surface/90 border-2 border-border rounded-none py-2 px-3 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex gap-1.5 items-center animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md z-50"
				>
						<button 
							onclick={() => { nodesState.addDocs(); activePill = null; }}
							class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5"/><path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z"/></svg>
							<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Doc <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-doc')}]</span></span>
						</button>
						<button 
							onclick={() => { nodesState.addSpreadsheet(); activePill = null; }}
							class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
							<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Sheet <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-sheet')}]</span></span>
						</button>
				</div>
			{/if}
		</div>


		<button
			onclick={() => nodesState.addColumn()}
			class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
			aria-label="Add Column"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Deck <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-column')}]</span></span>
		</button>

		<button
			onclick={() => nodesState.addBoard()}
			class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
			aria-label="Add Board"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Board <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-board')}]</span></span>
		</button>

		<!-- Media Group -->
		<div class="relative">
			<button
				onclick={() => togglePill("media")}
				class="group relative flex items-center justify-center w-8 h-8 rounded-none transition-colors {activePill === 'media' ? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/><circle cx="9" cy="12" r="2"/></svg>
				<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Media</span>
			</button>

			{#if activePill === 'media'}
				<div 
					class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-surface/90 border-2 border-border rounded-none py-2 px-3 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex gap-1.5 items-center animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md z-50"
				>
						<button 
							onclick={() => { nodesState.addImage(); activePill = null; }}
							class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
							<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Image <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-image')}]</span></span>
						</button>
						<button 
							onclick={() => { nodesState.addVideo(); activePill = null; }}
							class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 11 5 3-5 3v-6Z"/></svg>
							<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] uppercase font-mono font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Video <span class="ml-1 opacity-50">[{shortcutsState.getLabel('add-video')}]</span></span>
						</button>
				</div>
			{/if}
		</div>

		<div class="h-5 w-px bg-text-primary/10 mx-1"></div>

		<button
			onclick={clearBoard}
			class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-none transition-colors"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-red-500 border-border text-red-500 text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">Clear All</span>
		</button>

		<!-- Settings -->
		<button
			onclick={() => (themeState.isOpen = true)}
			class="group relative flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded-none transition-colors"
			aria-label="Settings"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
			<span class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 bg-surface border border-t-accent border-border text-accent text-[10px] font-bold tracking-widest rounded-none px-2 py-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none transition-opacity">SYS_CONF</span>
		</button>
	</div>
</div>
