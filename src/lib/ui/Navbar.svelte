<script>
	import { page } from '$app/stores';
	import { globalMetadata } from '$lib/state/nodes.svelte.js';

	// Derived state to check if we are inside a board or at the root
	let isNestedBoard = $derived(!!$page.params.id);
	let boardId = $derived($page.params.id);
	
	let isEditingBoardName = $state(false);
	let nameInputElement = $state();

	function handleNameInput(e) {
		globalMetadata.setName(boardId, e.target.value);
	}
	
	function startEditingName() {
		isEditingBoardName = true;
		setTimeout(() => { if (nameInputElement) nameInputElement.focus(); }, 0);
	}
</script>

<header class="absolute top-0 left-0 w-full h-12 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/80 backdrop-blur-md z-50 flex items-center px-4 justify-between select-none">
	<div class="flex items-center gap-4">
		<!-- Logo -->
		<a href="/" data-sveltekit-reload class="flex items-center gap-2 hover:opacity-80 transition-opacity">
			<div class="w-5 h-5 bg-[var(--color-text-primary)] rounded-sm flex items-center justify-center">
				<span class="text-[var(--color-canvas)] font-bold text-[10px] font-mono">L</span>
			</div>
			<span class="font-mono font-bold text-xs tracking-widest uppercase text-[var(--color-text-primary)]">Lattice</span>
		</a>

		<!-- Path / Breadcrumbs -->
		{#if isNestedBoard}
			<div class="flex items-center gap-2 text-[var(--color-text-secondary)] font-mono text-xs">
				<span class="opacity-50">/</span>
				
				{#if isEditingBoardName}
					<input 
						bind:this={nameInputElement}
						class="bg-transparent text-[var(--color-text-primary)] focus:outline-none w-32 font-bold border-b border-[var(--color-accent)]"
						value={globalMetadata.getName(boardId).startsWith('board_') ? '' : globalMetadata.getName(boardId)}
						oninput={handleNameInput}
						onblur={() => (isEditingBoardName = false)}
						onkeydown={(e) => { if (e.key === 'Enter') isEditingBoardName = false; }}
						placeholder="Board Name"
					/>
				{:else}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span 
						class="truncate max-w-[200px] text-[var(--color-text-primary)] cursor-pointer hover:underline hover:text-[var(--color-accent)] transition-colors" 
						title="Click to rename board"
						onclick={startEditingName}
					>
						{globalMetadata.getName(boardId)}
					</span>
				{/if}
				
				<!-- Back to workspace button -->
				<a href="/" data-sveltekit-reload class="ml-2 hover:text-[var(--color-text-primary)] flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded transition-colors text-[10px]">
					&larr; Exit
				</a>
			</div>
		{/if}
	</div>
	
	<div class="flex items-center gap-4 text-xs font-mono text-[var(--color-text-secondary)]">
		<!-- Status indicator -->
		<div class="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
			<div class="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_4px_rgba(34,197,94,0.8)]"></div>
			<span>Local</span>
		</div>
	</div>
</header>
