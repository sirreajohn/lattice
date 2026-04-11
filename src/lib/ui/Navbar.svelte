<script>
	import { page } from "$app/stores";
	import { globalMetadata, nodesState } from "$lib/state/nodes.svelte.js";
	import { env } from "$env/dynamic/public";
	import { goto } from "$app/navigation";

	const DB_MODE = env.PUBLIC_DB_MODE || "local";

	// Derived state to check if we are inside a board or at the root
	let boardId = $derived($page.params.id);
	let user = $derived($page.data.user);
	let isRootBoard = $derived(
		boardId === "default" || (boardId && boardId.startsWith("root_")),
	);
	let isBoardPage = $derived(!!boardId);

	let dbType = $derived($page.data.dbType);

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
	class="absolute top-0 left-0 w-full h-12 border-b-2 border-border bg-surface/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)] z-50 flex items-center px-6 justify-between select-none"
>
	<div class="flex items-center gap-4">
		<!-- Logo -->
		<a
			href="/"
			onclick={(e) => navigate(e, "/")}
			class="flex items-center gap-2 hover:opacity-80 transition-opacity"
		>
			<div class="w-2 h-2 bg-accent animate-pulse shadow-[0_0_8px_theme(colors.accent)]"></div>
			<span
				class="font-bold text-[10px] tracking-[0.2em] uppercase text-text-primary relative top-px"
				>SYS_LATTICE_</span
			>
		</a>

		<!-- Path / Breadcrumbs -->
		{#if isBoardPage}
			{@const backPath =
				nodesState.parentId && nodesState.parentId !== "default"
					? "/b/" + nodesState.parentId
					: "/"}
			<div
				class="flex items-center gap-2 text-text-secondary text-xs overflow-x-auto no-scrollbar max-w-[50vw]"
			>
				<span class="opacity-50">/</span>

				{#each nodesState.lineage as ancestor (ancestor.id)}
					<a
						href="/b/{ancestor.id}"
						onclick={(e) => navigate(e, `/b/${ancestor.id}`)}
						class="truncate max-w-[150px] hover:text-text-primary hover:underline transition-colors"
					>
						{globalMetadata.getName(ancestor.id)}
					</a>
					<span class="opacity-50">/</span>
				{/each}

				{#if isEditingBoardName}
					<input
						bind:this={nameInputElement}
						class="bg-accent/10 text-accent focus:outline-none w-32 font-bold px-2 py-0.5 border-b-2 border-accent shadow-[0_0_10px_var(--color-accent)]"
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

				{#if !isRootBoard}
					<!-- Back to workspace button -->
					<a
						href={backPath}
						onclick={(e) => navigate(e, backPath)}
						class="ml-2 hover:text-[var(--color-text-primary)] flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded transition-colors text-[10px]"
					>
						&larr; Back
					</a>
				{/if}
			</div>
		{/if}
	</div>

	<div
		class="flex items-center gap-4 text-xs text-text-secondary"
	>
		<div
			class="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)]"
			title={dbType === "temp"
				? "All changes will be lost on page reload"
				: dbType === "pglite"
					? "Could not connect to PostgreSQL. Saving to local PGlite (fallthrough mode)."
					: "Data is saved to central PostgreSQL"}
		>
			{#if dbType === "temp"}
				<div
					class="w-1.5 h-1.5 rounded-full bg-amber-500/80 shadow-[0_0_4px_rgba(245,158,11,0.8)]"
				></div>
				<span class="text-[var(--color-text-secondary)]"
					>Temp Session</span
				>
			{:else if dbType === "pglite"}
				<div
					class="w-1.5 h-1.5 rounded-full bg-blue-500/80 shadow-[0_0_4px_rgba(59,130,246,0.8)]"
				></div>
				<span class="text-[var(--color-text-secondary)] mr-1"
					>PGlite Fallback</span
				>
			{:else}
				<div
					class="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_4px_rgba(34,197,94,0.8)]"
				></div>
				<span class="text-text-secondary mr-1"
					>PostgreSQL</span
				>
			{/if}
		</div>

		<!-- GitHub Link -->
		<a
			href="https://github.com/sirreajohn/Lattice"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-2 px-2 py-1 rounded bg-surface border border-border hover:bg-neutral-800 transition-colors"
			title="View on GitHub"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path
					d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
				/><path d="M9 18c-4.51 2-5-2-7-2" /></svg
			>
			<span>GitHub</span>
		</a>

		{#if user && DB_MODE !== "temp"}
			<div class="relative">
				<!-- Industrial User Profile Trigger -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<button
					class="w-7 h-7 rounded-none bg-accent text-canvas flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-accent/80 transition-colors border-2 border-accent shadow-[0_0_10px_theme(colors.accent/0.3)]"
					onclick={() => (showUserMenu = !showUserMenu)}
					aria-label="User Menu"
				>
					{user.username.charAt(0).toUpperCase()}
				</button>

				<!-- Pillbox Dropdown -->
				{#if showUserMenu}
					<!-- Click-out interception -->
					<div
						class="fixed inset-0 z-40"
						onpointerdown={() => (showUserMenu = false)}
						role="presentation"
					></div>

					<div
						class="absolute right-0 top-10 w-48 bg-surface/95 backdrop-blur-md border-2 border-border border-t-accent rounded-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-4 z-[100] flex flex-col gap-3 animate-in fade-in slide-in-from-top-2"
					>
						<div class="flex flex-col gap-1">
							<span
								class="text-[8px] tracking-[0.2em] opacity-40 uppercase font-bold"
								>AUTH_SESSION_ACTIVE</span
							>
							<span
								class="text-text-primary font-bold truncate text-[11px] font-mono"
								>{user.username}</span
							>
						</div>
						<div
							class="h-px w-full bg-border/50 my-1"
						></div>
						<form method="POST" action="/auth/logout">
							<button
								type="submit"
								class="w-full text-left text-red-500 hover:text-red-400 text-[10px] font-bold tracking-[0.2em] transition-colors cursor-pointer flex items-center justify-between group"
							>
								<span>LOGOUT_</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="group-hover:translate-x-0.5 transition-transform"
									><path
										d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
									></path><polyline points="16 17 21 12 16 7"
									></polyline><line
										x1="21"
										y1="12"
										x2="9"
										y2="12"
									></line></svg
								>
							</button>
						</form>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</header>
