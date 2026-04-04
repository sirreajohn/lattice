<script>
	import Canvas from "$lib/canvas/Canvas.svelte";
	import Toolbar from "$lib/ui/Toolbar.svelte";
	import { nodesState } from "$lib/state/nodes.svelte.js";

	$effect(() => {
		if (nodesState.boardId !== "default") {
			nodesState.forceSave(); // Synchronously stash the old board before mutating state
			nodesState.boardId = "default";
			nodesState.nodes.length = 0;
			nodesState.connections.length = 0;
			nodesState.selectedNodeId = null;
			nodesState.loadFromStorage();
		}
	});
</script>

<Canvas>
	<Toolbar />
</Canvas>
