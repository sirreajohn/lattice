<script>
	import { themeState, PRESETS } from "$lib/state/theme.svelte.js";
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import { canvasState } from "$lib/state/canvas.svelte.js";
	import { shortcutsState } from "$lib/state/shortcuts.svelte.js";
	import { env } from "$env/dynamic/public";

	let activeTab = $state("customization");
	/** @type {string | null} */
	let recordingAction = $state(null);
	/** @type {Array<any>} */
	let userBoards = $state([]);
	let loadingBoards = $state(false);

	// Data management state
	let isExporting = $state(false);
	let isImporting = $state(false);
	/** @type {string | null} */
	let importStatus = $state(null);
	/** @type {HTMLInputElement | null} */
	let fileInput = $state(null);

	$effect(() => {
		if (themeState.isOpen && activeTab === "boards") {
			fetchBoards();
		}
	});

	async function fetchBoards() {
		loadingBoards = true;
		try {
			if (env.PUBLIC_DB_MODE === "temp") {
				// Filter out 'default' board and map to expected UI structure
				userBoards = nodesState
					.getKnownBoards()
					.filter((b) => b.id !== "default");
				return;
			}

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
			if (env.PUBLIC_DB_MODE === "temp") {
				nodesState._tempCache.delete(boardId);
				userBoards = userBoards.filter((b) => b.id !== boardId);
				return;
			}

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

	async function handleExport() {
		isExporting = true;
		try {
			let blob;
			if (env.PUBLIC_DB_MODE === "temp") {
				const payload = nodesState.exportState();
				const jsonStr = JSON.stringify(payload);
				const encoded = new TextEncoder().encode(jsonStr);

				// Client-side CompressionStream (supported in modern browsers)
				const cs = new CompressionStream("gzip");
				const writer = cs.writable.getWriter();
				await writer.write(encoded);
				await writer.close();

				const compressed = await new Response(
					cs.readable,
				).arrayBuffer();
				blob = new Blob([compressed], {
					type: "application/octet-stream",
				});
			} else {
				const res = await fetch("/api/data/export");
				if (!res.ok) {
					const err = await res.json();
					alert(err.error || "Export failed");
					return;
				}
				blob = await res.blob();
			}

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `lattice-backup-${new Date().toISOString().slice(0, 10)}.lattice`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error("Export error", e);
			alert("Failed to export data");
		} finally {
			isExporting = false;
		}
	}

	/** @param {Event} e */
	async function handleImport(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		const file = target.files?.[0];
		if (!file) return;

		if (!file.name.endsWith(".lattice")) {
			alert("Please select a .lattice backup file.");
			target.value = "";
			return;
		}

		if (
			!confirm(
				"This will merge imported data with your existing boards. Continue?",
			)
		) {
			target.value = "";
			return;
		}

		isImporting = true;
		importStatus = null;
		try {
			const arrayBuffer = await file.arrayBuffer();

			if (env.PUBLIC_DB_MODE === "temp") {
				// Client-side Decompression
				const ds = new DecompressionStream("gzip");
				const writer = ds.writable.getWriter();
				writer.write(new Uint8Array(arrayBuffer));
				writer.close();

				const decompressed = await new Response(ds.readable).text();
				const payload = JSON.parse(decompressed);

				if (nodesState.importState(payload)) {
					importStatus = `Imported ${payload.boards?.length || 0} board(s) successfully to session.`;
				} else {
					importStatus = "Invalid backup file format";
				}
			} else {
				const res = await fetch("/api/data/import", {
					method: "POST",
					body: file,
				});
				const result = await res.json();
				if (res.ok) {
					importStatus = `Imported ${result.imported} board(s) successfully${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}.`;
				} else {
					importStatus = result.error || "Import failed";
				}
			}
		} catch (err) {
			console.error("Import error", err);
			importStatus = "Failed to import data";
		} finally {
			isImporting = false;
			target.value = "";
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
			if (e.key !== "Escape") {
				shortcutsState.setBinding(action, e.key);
			}
			recordingAction = null;
			window.removeEventListener("keydown", listener, true);
		};
		window.addEventListener("keydown", listener, true);
	}

	const shortcutCategories = [
		{
			title: "Tools",
			items: [
				{ action: "tool-pointer", label: "Select Tool" },
				{ action: "tool-pencil", label: "Draw Tool" },
				{ action: "tool-eraser", label: "Eraser Tool" },
			],
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
			],
		},
	];
</script>

{#if themeState.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
		onclick={() => (themeState.isOpen = false)}
	>
		<div
			class="w-full max-w-4xl h-[600px] bg-surface border-2 border-border shadow-[0_0_50px_rgba(0,0,0,0.8)] flex overflow-hidden relative rounded-none"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Sidebar -->
			<div
				class="w-48 bg-canvas border-r border-border flex flex-col"
			>
				<div
					class="px-4 py-5 text-[10px] font-bold text-accent tracking-[0.2em] uppercase border-b border-border flex items-center gap-2 shadow-sm"
				>
					<div class="w-2 h-2 bg-accent animate-pulse shadow-[0_0_8px_var(--color-accent)]"></div>
					SYS_CONF_
				</div>

				<div class="flex-1 py-4 flex flex-col gap-1">
					{#each [{ id: "customization", label: "UI_THEME" }, { id: "shortcuts", label: "KEYBINDS" }, { id: "boards", label: "BOARD_MANAGE" }, { id: "data", label: "DATA_MANAGE" }] as tab}
						<button
							class="w-full text-left px-4 py-3 text-[10px] tracking-widest transition-all relative flex items-center {activeTab ===
							tab.id
								? 'text-accent bg-accent/20 shadow-[inset_0_-2px_0_0_var(--color-accent)]'
								: 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}"
							onclick={() => (activeTab = tab.id)}
						>
							<span
								class="mr-2 opacity-70 {activeTab === tab.id
									? 'animate-pulse'
									: ''}"
								>{activeTab === tab.id ? ">" : "-"}</span
							>
							{tab.label}
						</button>
					{/each}
				</div>

				<div
					class="p-4 text-[9px] text-text-secondary opacity-50 tracking-widest border-t border-border"
				>
					LTTCE_OS // v1.0
				</div>
			</div>

			{#if activeTab === "customization"}
				<!-- Content Area -->
				<div class="flex-1 overflow-y-auto p-8 relative">
					<button
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded transition-colors"
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
						class="text-2xl font-bold text-text-primary mb-6"
					>
						Customization
					</h2>

					<div class="space-y-8">
						<!-- Colors Section -->
						<section>
							<div
								class="flex items-center justify-between mb-4 pb-2 border-b border-border"
							>
								<h3
									class="text-sm font-bold text-text-secondary tracking-wider"
								>
									Colors & Themes
								</h3>

								<div class="flex items-center gap-2">
									<select
										class="bg-canvas border border-border text-text-primary text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent min-w-[120px]"
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
										class="flex items-center justify-between bg-canvas p-3 rounded-md border border-border hover:border-accent transition-colors"
									>
										<label
											for="color-{key}"
											class="text-sm font-medium text-text-primary cursor-pointer select-none"
										>
											{label}
										</label>
										<div
											class="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shadow-inner flex shrink-0"
										>
											<input
												id="color-{key}"
												type="color"
												value={themeState.colors[/** @type {keyof typeof themeState.colors} */ (key)]}
												oninput={(e) =>
													handleColorChange(/** @type {keyof typeof themeState.colors} */ (key), e)}
												class="absolute -inset-2 w-16 h-16 cursor-pointer opacity-0"
											/>
											<div
												class="w-full h-full pointer-events-none"
												style="background-color: {themeState.colors[/** @type {keyof typeof themeState.colors} */ (key)]}"
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
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded transition-colors"
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
						class="text-2xl font-bold text-text-primary mb-4"
					>
						Keyboard Shortcuts
					</h2>
					<p class="text-sm text-text-secondary mb-8">
						Click a shortcut to change it. Avoid common browser
						shortcuts like Cmd+T or Cmd+R.
					</p>

					<div class="space-y-8">
						{#each shortcutCategories as category}
							<section>
								<h3
									class="text-xs font-bold text-text-secondary tracking-wider mb-4 pb-2 border-b border-border"
								>
									{category.title}
								</h3>
								<div class="space-y-2">
									{#each category.items as { action, label }}
										<div
											class="flex items-center justify-between bg-canvas p-3 rounded-md border border-border transition-colors hover:border-accent/50"
										>
											<span
												class="text-sm font-medium text-text-primary"
												>{label}</span
											>
											<button
												onclick={() =>
													startRecording(action)}
												class="px-3 py-1.5 min-w-[60px] rounded border {recordingAction ===
												action
													? 'bg-accent border-accent text-white animate-pulse'
													: 'bg-text-primary/5 border-border text-accent'} transition-all text-xs flex items-center justify-center"
											>
												{#if recordingAction === action}
													Record...
												{:else}
													{shortcutsState.getLabel(
														action,
													) || "None"}
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
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded transition-colors"
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
						class="text-2xl font-bold text-text-primary mb-6"
					>
						Board Management
					</h2>

					<p class="text-sm text-text-secondary mb-6">
						Here you can view all boards associated with your
						account or device. If you've lost track of a board on
						the canvas, you can reinsert it here. Reinserting links
						the board node to its original historical data.
						{#if env.PUBLIC_DB_MODE === "temp"}
							<br /><b class="text-accent"
								>Showing in-memory boards for this scratch
								session.</b
							>
						{/if}
					</p>

					<div class="space-y-3">
						{#if loadingBoards}
							<div
								class="text-sm tracking-wide text-text-secondary animate-pulse"
							>
								Fetching Data...
							</div>
						{:else if userBoards.length === 0}
							<div
								class="text-sm text-text-secondary italic"
							>
								No boards found. Make sure you've saved a board.
							</div>
						{:else}
							{#each userBoards as board}
								<div
									class="flex items-center justify-between bg-canvas p-3 rounded-md border border-border hover:border-accent transition-colors"
								>
									<div>
										<div
											class="text-sm font-bold text-text-primary"
										>
											{board.name ||
												`board_${board.id.slice(0, 6)}`}
										</div>
										<div
											class="text-[10px] text-text-secondary mt-1 opacity-70"
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
											class="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent hover:text-surface border border-accent/50 rounded transition-colors"
										>
											Reinsert
										</button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{:else if activeTab === "data"}
				<!-- Data Management Area -->
				<div class="flex-1 overflow-y-auto p-8 relative">
					<button
						class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/10 rounded transition-colors"
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

					<h2 class="text-2xl font-bold text-text-primary mb-4">
						Data Management
					</h2>
					<p class="text-sm text-text-secondary mb-8 max-w-lg">
						Secure your workspace by downloading portable backups or
						restoring previous sessions. All data is compressed for
						efficiency.
					</p>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Export Card -->
						<div
							class="group relative flex flex-col bg-canvas border border-border rounded-xl p-6 transition-all hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 shadow-sm"
						>
							<div
								class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="48"
									height="48"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path
										d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
									/><polyline points="17 8 12 3 7 8" /><line
										x1="12"
										y1="15"
										x2="12"
										y2="3"
									/></svg
								>
							</div>

							<h3
								class="text-lg font-bold text-text-primary mb-2"
							>
								Export Workspace
							</h3>
							<p
								class="text-xs text-text-secondary leading-relaxed mb-8 flex-1"
							>
								Generate a <code class="text-accent font-bold"
									>.lattice</code
								> file containing all your boards, nodes, drawings,
								and connections. Perfect for backups or moving to
								another device.
							</p>

							<button
								onclick={handleExport}
								disabled={isExporting}
								class="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all
									{isExporting
									? 'bg-text-primary/10 text-text-secondary cursor-wait'
									: 'bg-accent text-canvas hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] cursor-pointer'}"
							>
								{#if isExporting}
									<span class="animate-pulse"
										>Preparing...</span
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path
											d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
										/><polyline
											points="17 8 12 3 7 8"
										/><line
											x1="12"
											y1="15"
											x2="12"
											y2="3"
										/></svg
									>
									Download Backup
								{/if}
							</button>
						</div>

						<!-- Import Card -->
						<div
							class="group relative flex flex-col bg-canvas border border-border rounded-xl p-6 transition-all hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 shadow-sm"
						>
							<div
								class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="48"
									height="48"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path
										d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
									/><polyline
										points="7 10 12 15 17 10"
									/><line
										x1="12"
										y1="3"
										x2="12"
										y2="15"
									/></svg
								>
							</div>

							<h3
								class="text-lg font-bold text-text-primary mb-2"
							>
								Import Data
							</h3>
							<p
								class="text-xs text-text-secondary leading-relaxed mb-8 flex-1"
							>
								Restore data from a backup file. This will merge
								the imported boards with your existing
								workspace. Only <code
									class="text-accent font-bold">.lattice</code
								> files are supported.
							</p>

							<div class="flex flex-col gap-3">
								<input
									bind:this={fileInput}
									type="file"
									accept=".lattice"
									onchange={handleImport}
									class="hidden"
									id="lattice-import-input"
								/>
								<button
									onclick={() => fileInput?.click()}
									disabled={isImporting}
									class="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all
										{isImporting
										? 'bg-text-primary/10 text-text-secondary cursor-wait'
										: 'bg-surface text-text-primary border border-border hover:border-accent hover:bg-surface active:scale-[0.98] cursor-pointer shadow-sm'}"
								>
									{#if isImporting}
										<span class="animate-pulse"
											>Processing...</span
										>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											><path
												d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
											/><polyline
												points="7 10 12 15 17 10"
											/><line
												x1="12"
												y1="3"
												x2="12"
												y2="15"
											/></svg
										>
										Import Backup
									{/if}
								</button>

								{#if importStatus}
									<div
										class="mt-2 px-3 py-2 rounded flex items-center gap-2 text-[10px] font-mono border {importStatus.startsWith(
											'Imported',
										)
											? 'bg-green-500/5 text-green-400 border-green-500/20'
											: 'bg-red-500/5 text-red-400 border-red-500/20'}"
									>
										<div
											class="w-1 h-1 rounded-full {importStatus.startsWith(
												'Imported',
											)
												? 'bg-green-400 animate-pulse'
												: 'bg-red-400'}"
										></div>
										{importStatus}
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Info -->
					<div
						class="mt-4 p-3 rounded-md bg-canvas border border-border text-[10px] font-mono text-text-secondary leading-relaxed"
					>
						<strong class="text-text-primary">Format:</strong>
						<code>.lattice</code>
						— compressed binary backup.<br />
						<strong class="text-text-primary">Scope:</strong>
						All boards owned by your account.<br />
						<strong class="text-text-primary"
							>Import behaviour:</strong
						> Existing boards are overwritten if IDs match.
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
