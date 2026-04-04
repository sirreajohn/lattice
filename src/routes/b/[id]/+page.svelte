<script>
	import { page } from "$app/stores";
	import Canvas from "$lib/canvas/Canvas.svelte";
	import Toolbar from "$lib/ui/Toolbar.svelte";
	import { nodesState, globalMetadata } from "$lib/state/nodes.svelte.js";

	$effect(() => {
		const boardId = $page.params.id;
		if (boardId && nodesState.boardId !== boardId) {
			nodesState.forceSave(); // Synchronously stash the old board before mutating state
			nodesState.boardId = boardId;
			nodesState.nodes.length = 0;
			nodesState.connections.length = 0;
			nodesState.selectedNodeId = null;

			const parentId = $page.url.searchParams.get("parent") || null;
			const depth = Number($page.url.searchParams.get("depth")) || 0;
			nodesState.loadFromStorage(parentId, depth);
		}
	});
</script>

<svelte:head>
	<title>{globalMetadata.getName($page.params.id)} - Lattice</title>
</svelte:head>

<Canvas>
	<Toolbar />
</Canvas>
