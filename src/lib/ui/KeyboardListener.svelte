<script>
	import { onMount } from "svelte";
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import { shortcutsState } from "$lib/state/shortcuts.svelte.js";

	function handleKeydown(e) {
		// Ignore if the user is typing in an input field
		const active = document.activeElement;
		const isInput =
			active.tagName === "INPUT" ||
			active.tagName === "TEXTAREA" ||
			active.isContentEditable;

		if (isInput) return;

		// Ignore if a modifier is held (unless we add support for them later)
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		const key = e.key.toLowerCase();
		const bindings = shortcutsState.bindings;

		// Find if anyone matches this key
		for (const [action, bindKey] of Object.entries(bindings)) {
			if (bindKey === key) {
				executeAction(action);
				e.preventDefault();
				break;
			}
		}
	}

	function executeAction(action) {
		switch (action) {
			case "tool-pointer":
				nodesState.activeTool = "pointer";
				break;
			case "tool-pencil":
				nodesState.activeTool = "pencil";
				break;
			case "tool-eraser":
				nodesState.activeTool = "eraser";
				break;
			case "tool-text":
				nodesState.activeTool = "text";
				break;
			case "add-frame":
				nodesState.addFrame();
				break;
			case "add-note":
				nodesState.addNote();
				break;
			case "add-board":
				nodesState.addBoard();
				break;
			case "add-column":
				nodesState.addColumn();
				break;
			case "add-image":
				nodesState.addImage();
				break;
			case "add-doc":
				nodesState.addDocs();
				break;
			case "add-sheet":
				nodesState.addSpreadsheet();
				break;
			case "add-video":
				nodesState.addVideo();
				break;
		}
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	});
</script>
