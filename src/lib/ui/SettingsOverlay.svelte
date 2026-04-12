<script>
	import { themeState, PRESETS } from "$lib/state/theme.svelte.js";
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import { canvasState } from "$lib/state/canvas.svelte.js";
	import { shortcutsState } from "$lib/state/shortcuts.svelte.js";

	let activeTab = $state("customization");
	/** @type {string | null} */
	let recordingAction = $state(null);
	/** @type {Array<any>} */
	let userBoards = $state([]);
	let loadingBoards = $state(false);

	$effect(() => {
		if (themeState.isOpen && activeTab === "boards") {
			fetchBoards();
		}
	});

	async function fetchBoards() {
		loadingBoards = true;
		try {
			const res = await fetch("/api/boards");
			if (res.ok) {
				const data = await res.json();
				// Filter out 'default' board since it's the root canvas, not a dangling one
				userBoards = (data.boards || []).filter(
					(/** @type {any} */ b) => b.id !== "default",
				);
			}
		} catch (e) {
			console.error("Failed to fetch boards", e);
		} finally {
			loadingBoards = false;
		}
	}
	
	/** @param {any} board */
	function reinsertBoard(board) {
		const screenCenter = {
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
		};
		const canvasCenter = canvasState.screenToCanvas(
			screenCenter.x,
			screenCenter.y,
		);
		nodesState.addNode(
			"board",
			canvasCenter.x - 125,
			canvasCenter.y - 75,
			{ title: board.name },
			board.id,
		);
		themeState.isOpen = false;
	}

	/** @param {string} boardId */
	async function deleteBoard(boardId) {
		if (!confirm("Are you sure you want to permanently delete this board?"))
			return;

		try {
			const res = await fetch(`/api/boards/${boardId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				userBoards = userBoards.filter((b) => b.id !== boardId);
			} else {
				alert("Failed to delete board");
			}
		} catch (e) {
			console.error("Delete error", e);
			alert("Failed to delete board");
		}
	}

	const colorKeys = [
		{ key: "canvas", label: "Canvas Background" },
		{ key: "surface", label: "Cards & Surfaces" },
		{ key: "border", label: "Borders & Lines" },
		{ key: "text-primary", label: "Primary Text" },
		{ key: "text-secondary", label: "Secondary Text" },
		{ key: "accent", label: "Accent Color" },
		{ key: "lines", label: "Connection Arrows" },
	];

	/** 
	 * @param {string} key 
	 * @param {any} event 
	 */
	function handleColorChange(key, event) {
		themeState.setColor(key, event.target.value);
	}

	/** @param {any} event */
	function handlePresetChange(event) {
		if (event.target.value !== "custom") {
			themeState.setPreset(event.target.value);
		}
	}

	/** @param {string} action */
	function startRecording(action) {
		recordingAction = action;
		/** @param {KeyboardEvent} e */
		const listener = (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.key !== 'Escape') {
				shortcutsState.setBinding(action, e.key);
			}
			recordingAction = null;
			window.removeEventListener('keydown', listener, true);
		};
		window.addEventListener('keydown', listener, true);
	}

	const shortcutCategories = [
		{
			title: "Tools",
			items: [
				{ action: "tool-pointer", label: "Select Tool" },
				{ action: "tool-pencil", label: "Draw Tool" },
				{ action: "tool-eraser", label: "Eraser Tool" },
			]
		},
		{
			title: "Cards & Boards",
			items: [
				{ action: "add-note", label: "New Note" },
				{ action: "add-board", label: "New Sub-Board" },
				{ action: "add-column", label: "New Column/Deck" },
				{ action: "add-image", label: "New Image" },
				{ action: "add-doc", label: "New Document" },
				{ action: "add-sheet", label: "New Spreadsheet" },
				{ action: "add-video", label: "New Video" },
			]
		}
	];
</script>

{#if themeState.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
		onclick={() => (themeState.isOpen = false)}
	>
		<div
			class="w-full max-w-2xl h-[500px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl flex overflow-hidden relative"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Sidebar -->
			<div
				class="w-48 bg-black/20 border-r border-[var(--color-border)] flex flex-col p-2"
			>
				<div
					class="px-3 py-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2"
				>
					Settings
				</div>
				<button
					class="w-full text-left px-3 py-2 rounded-md font-medium text-sm transition-colors {activeTab ===
					'customization'
						? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
						: 'text-[var(--color-text-primary)] hover:bg-neutral-800'}"
					onclick={() => (activeTab = "customization")}
				>
					Customization
				</button>
				<button
					class="w-full text-left px-3 py-2 rounded-md font-medium text-sm transition-colors mt-1 {activeTab ===
					'shortcuts'
						? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
						: 'text-[var(--color-text-primary)] hover:bg-neutral-800'}"
					onclick={() => (activeTab = "shortcuts")}
				>
					Keyboard Shortcuts
				</button>
				<button
					class="w-full text-left px-3 py-2 rounded-md font-medium text-sm transition-colors mt-1 {activeTab ===
					'boards'
						? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
						: 'text-[var(--color-text-primary)] hover:bg-neutral-800'}"
					onclick={() => (activeTab = "boards")}
				>
					Board Management
				</button>
			</div>

			{#if activeTab === "customization"}
				<!-- Content Area -->
				<div class="flex-1 overflow-y-auto p-8 relative">
					<button
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-neutral-800 rounded transition-colors"
						onclick={() => (themeState.isOpen = false)}
						aria-label="Close"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
						>
					</button>

					<h2
						class="text-2xl font-bold text-[var(--color-text-primary)] mb-6"
					>
						Customization
					</h2>

					<div class="space-y-8">
						<!-- Colors Section -->
						<section>
							<div
								class="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-border)]"
							>
								<h3
									class="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider"
								>
									Colors & Themes
								</h3>

								<div class="flex items-center gap-2">
									<select
										class="bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-[var(--color-accent)] min-w-[120px]"
										value={themeState.currentPreset}
										onchange={handlePresetChange}
									>
										<option value="custom">Custom</option>
										<optgroup label="Presets">
											{#each Object.keys(PRESETS) as presetId}
												<option value={presetId}>
													{presetId
														.charAt(0)
														.toUpperCase() +
														presetId.slice(1)}
												</option>
											{/each}
										</optgroup>
									</select>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								{#each colorKeys as { key, label }}
									<div
										class="flex items-center justify-between bg-[var(--color-canvas)] p-3 rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
									>
										<label
											for="color-{key}"
											class="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer select-none"
										>
											{label}
										</label>
										<div
											class="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shadow-inner flex shrink-0"
										>
											<input
												id="color-{key}"
												type="color"
												value={themeState.colors[key]}
												oninput={(e) =>
													handleColorChange(key, e)}
												class="absolute -inset-2 w-16 h-16 cursor-pointer opacity-0"
											/>
											<div
												class="w-full h-full pointer-events-none"
												style="background-color: {themeState
													.colors[key]}"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</section>
					</div>
				</div>
			{:else if activeTab === "shortcuts"}
				<!-- Shortcuts Area -->
				<div class="flex-1 overflow-y-auto p-8 relative">
					<button
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-neutral-800 rounded transition-colors"
						onclick={() => (themeState.isOpen = false)}
						aria-label="Close"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
					</button>

					<h2 class="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Keyboard Shortcuts</h2>
					<p class="text-sm text-[var(--color-text-secondary)] mb-8">Click a shortcut to change it. Avoid common browser shortcuts like Cmd+T or Cmd+R.</p>

					<div class="space-y-8">
						{#each shortcutCategories as category}
							<section>
								<h3 class="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4 pb-2 border-b border-[var(--color-border)]">
									{category.title}
								</h3>
								<div class="space-y-2">
									{#each category.items as { action, label }}
										<div class="flex items-center justify-between bg-[var(--color-canvas)] p-3 rounded-md border border-[var(--color-border)] transition-colors hover:border-[var(--color-accent)]/50">
											<span class="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
											<button 
												onclick={() => startRecording(action)}
												class="px-3 py-1.5 min-w-[60px] rounded border {recordingAction === action ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white animate-pulse' : 'bg-black/40 border-[var(--color-border)] text-[var(--color-accent)] font-mono'} transition-all text-xs flex items-center justify-center"
											>
												{#if recordingAction === action}
													Record...
												{:else}
													{shortcutsState.getLabel(action) || 'None'}
												{/if}
											</button>
										</div>
									{/each}
								</div>
							</section>
						{/each}
					</div>
				</div>
			{:else if activeTab === "boards"}
				<!-- Boards Area -->
				<div class="flex-1 overflow-y-auto p-8 relative">
					<button
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-neutral-800 rounded transition-colors"
						onclick={() => (themeState.isOpen = false)}
						aria-label="Close"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
						>
					</button>

					<h2
						class="text-2xl font-bold text-[var(--color-text-primary)] mb-6"
					>
						Board Management
					</h2>

					<p class="text-sm text-[var(--color-text-secondary)] mb-6">
						Here you can view all boards associated with your
						account or device. If you've lost track of a board on
						the canvas, you can reinsert it here. Reinserting links
						the board node to its original historical data.
						<b>This feature is not available in temp sessions.</b>
					</p>

					<div class="space-y-3">
						{#if loadingBoards}
							<div
								class="text-sm tracking-wide text-[var(--color-text-secondary)] animate-pulse uppercase"
							>
								Fetching Data...
							</div>
						{:else if userBoards.length === 0}
							<div
								class="text-sm text-[var(--color-text-secondary)] italic"
							>
								No boards found. Make sure you've saved a board.
							</div>
						{:else}
							{#each userBoards as board}
								<div
									class="flex items-center justify-between bg-[var(--color-canvas)] p-3 rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
								>
									<div>
										<div
											class="text-sm font-bold text-[var(--color-text-primary)]"
										>
											{board.name ||
												`board_${board.id.slice(0, 6)}`}
										</div>
										<div
											class="text-[10px] text-[var(--color-text-secondary)] font-mono mt-1 opacity-70"
										>
											ID: {board.id} <br />
											Last Update: {new Date(
												board.updated_at,
											).toLocaleDateString()}
										</div>
									</div>

									<div class="flex gap-2">
										<button
											onclick={() =>
												deleteBoard(board.id)}
											class="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 border border-transparent rounded transition-colors"
											title="Delete permanent record"
										>
											Delete
										</button>
										<button
											onclick={() => reinsertBoard(board)}
											class="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-surface)] border border-[var(--color-accent)]/50 rounded transition-colors"
										>
											Reinsert
										</button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
