<script>
	import { page } from "$app/stores";
	import { globalMetadata, nodesState } from "$lib/state/nodes.svelte.js";
	import { env } from "$env/dynamic/public";
	import { goto } from "$app/navigation";

	const DB_MODE = env.PUBLIC_DB_MODE || "local";

	// Derived state to check if we are inside a board or at the root
	let isNestedBoard = $derived(!!$page.params.id);
	let boardId = $derived($page.params.id);
	let user = $derived($page.data.user);

	let isEditingBoardName = $state(false);
	let nameInputElement = $state();
	let showUserMenu = $state(false);

	function handleNameInput(e) {
		globalMetadata.setName(boardId, e.target.value);
		nodesState.saveToStorage(); // Schedule save immediately on rename
	}

	function startEditingName() {
		isEditingBoardName = true;
		setTimeout(() => {
			if (nameInputElement) nameInputElement.focus();
		}, 0);
	}

	async function navigate(e, path) {
		if (e) e.preventDefault();
		nodesState.forceSave();
		await goto(path);
	}
</script>

<header
	class="absolute top-0 left-0 w-full h-12 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/80 backdrop-blur-md z-50 flex items-center px-4 justify-between select-none"
>
	<div class="flex items-center gap-4">
		<!-- Logo -->
		<a
			href="/"
			onclick={(e) => navigate(e, "/")}
			class="flex items-center gap-2 hover:opacity-80 transition-opacity"
		>
			<div
				class="w-5 h-5 bg-[var(--color-text-primary)] rounded-sm flex items-center justify-center"
			>
				<span
					class="text-[var(--color-canvas)] font-bold text-[10px] font-mono"
					>L</span
				>
			</div>
			<span
				class="font-mono font-bold text-xs tracking-widest uppercase text-[var(--color-text-primary)]"
				>Lattice</span
			>
		</a>

		<!-- Path / Breadcrumbs -->
		{#if isNestedBoard}
			{@const backPath = nodesState.parentId && nodesState.parentId !== 'default' ? '/b/' + nodesState.parentId : '/'}
			<div
				class="flex items-center gap-2 text-[var(--color-text-secondary)] font-mono text-xs overflow-x-auto no-scrollbar max-w-[50vw]"
			>
				<span class="opacity-50">/</span>

				{#each nodesState.lineage as ancestor (ancestor.id)}
					<a
						href="/b/{ancestor.id}"
						onclick={(e) => navigate(e, `/b/${ancestor.id}`)}
						class="truncate max-w-[150px] hover:text-[var(--color-text-primary)] hover:underline transition-colors"
					>
						{globalMetadata.getName(ancestor.id)}
					</a>
					<span class="opacity-50">/</span>
				{/each}

				{#if isEditingBoardName}
					<input
						bind:this={nameInputElement}
						class="bg-transparent text-[var(--color-text-primary)] focus:outline-none w-32 font-bold border-b border-[var(--color-accent)]"
						value={globalMetadata
							.getName(boardId)
							.startsWith("board_")
							? ""
							: globalMetadata.getName(boardId)}
						oninput={handleNameInput}
						onblur={() => (isEditingBoardName = false)}
						onkeydown={(e) => {
							if (e.key === "Enter") isEditingBoardName = false;
						}}
						placeholder="Board Name"
					/>
				{:else}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						class="truncate max-w-[200px] text-[var(--color-text-primary)] cursor-pointer hover:underline hover:text-[var(--color-accent)] transition-colors font-bold"
						title="Click to rename board"
						onclick={startEditingName}
					>
						{globalMetadata.getName(boardId)}
					</span>
				{/if}

				<!-- Back to workspace button -->
				<a
					href={backPath}
					onclick={(e) => navigate(e, backPath)}
					class="ml-2 hover:text-[var(--color-text-primary)] flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded transition-colors text-[10px]"
				>
					&larr; Back
				</a>
			</div>
		{/if}
	</div>

	<div
		class="flex items-center gap-4 text-xs font-mono text-[var(--color-text-secondary)]"
	>
		<div
			class="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)]"
			title={DB_MODE === "temp"
				? "All changes will be lost on page reload"
				: "Data is saved locally"}
		>
			{#if DB_MODE === "temp"}
				<div
					class="w-1.5 h-1.5 rounded-full bg-amber-500/80 shadow-[0_0_4px_rgba(245,158,11,0.8)]"
				></div>
				<span class="text-[var(--color-text-secondary)]"
					>Temp Session (No Save)</span
				>
			{:else}
				<div
					class="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_4px_rgba(34,197,94,0.8)]"
				></div>
				<span class="text-[var(--color-text-secondary)]">Local DB</span>
			{/if}
		</div>

		{#if user && DB_MODE !== "temp"}
			<div class="relative">
				<!-- Circular User Profile -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div 
					class="w-7 h-7 rounded-full bg-[var(--color-accent)] text-[var(--color-canvas)] flex items-center justify-center font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
					onclick={() => showUserMenu = !showUserMenu}
				>
					{user.username.charAt(0).toUpperCase()}
				</div>

				<!-- Pillbox Dropdown -->
				{#if showUserMenu}
					<div class="absolute right-0 top-10 w-48 bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-lg shadow-xl p-4 z-[100] flex flex-col gap-3">
						<div class="flex flex-col gap-1">
							<span class="text-[9px] uppercase tracking-widest opacity-50">Signed in as</span>
							<span class="text-[var(--color-text-primary)] font-bold truncate text-sm">{user.username}</span>
						</div>
						<div class="h-px w-full bg-[var(--color-border)] my-1"></div>
						<form method="POST" action="/auth/logout">
							<button type="submit" class="w-full text-left text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
								Log Out
							</button>
						</form>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</header>
