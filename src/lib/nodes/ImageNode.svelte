<script>
	import { nodesState } from "$lib/state/nodes.svelte.js";

	let { node } = $props();

	let isSelected = $derived(nodesState.selectedNodeId === node.id);

	function updateSrc(e) {
		if (e.key === "Enter") {
			nodesState.updateNodeData(node.id, { src: e.target.value.trim() });
		}
	}

	function updateAlt(e) {
		nodesState.updateNodeData(node.id, { alt: e.target.value });
	}
</script>

<div class="h-full w-full flex flex-col relative bg-[var(--color-surface)]">
	{#if !node.data.src}
		<div class="flex-1 flex items-center justify-center p-4">
			<input
				type="text"
				placeholder="Paste image URL & press Enter..."
				class="w-full bg-black/20 border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
				onkeydown={updateSrc}
				onpointerdown={(e) => e.stopPropagation()}
			/>
		</div>
	{:else}
		<!-- Image wrapper with auto overflow to trigger scrollbars if card is resized smaller than image -->
		<div class="flex-1 w-full h-full overflow-auto custom-scrollbar p-2">
			<img
				src={node.data.src}
				alt={node.data.alt || "User added image"}
				class="block w-full h-auto min-w-[200px] border border-[var(--color-border)] rounded-sm grayscale-[0.2] hover:grayscale-0 transition-all duration-300 shadow-sm"
				draggable="false"
			/>
		</div>

		{#if isSelected}
			<div
				class="absolute bottom-2 left-2 right-2 z-10 animate-in fade-in slide-in-from-bottom-2"
			>
				<input
					type="text"
					placeholder="Alt text..."
					value={node.data.alt || ""}
					oninput={updateAlt}
					class="w-full bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] shadow-xl rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)] pointer-events-auto"
					onpointerdown={(e) => e.stopPropagation()}
				/>
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Thin translucent scrollbar for images */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: var(--color-text-secondary);
	}
</style>
