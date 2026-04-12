<script>
	import { nodesState } from "$lib/state/nodes.svelte.js";

	/**
	 * @param {Array<{x: number, y: number}>} points
	 * @returns {string} SVG path string
	 */
	function getBezierPath(points) {
		if (!points || points.length === 0) return '';
		if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
		if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
		
		let path = `M ${points[0].x} ${points[0].y}`;
		
		for (let i = 0; i < points.length - 1; i++) {
			const xc = (points[i].x + points[i + 1].x) / 2;
			const yc = (points[i].y + points[i + 1].y) / 2;
			path += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
		}
		path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
		
		return path;
	}

	/**
	 * @param {PointerEvent} e
	 * @param {string} drawingId
	 */
	function handlePointerEnter(e, drawingId) {
		// e.buttons === 1 checks if primary mouse button is held down over this path
		if (nodesState.activeTool === 'eraser' && (e.buttons === 1 || e.buttons === 3)) {
			nodesState.removeDrawing(drawingId);
		}
	}

	/**
	 * @param {PointerEvent} e
	 * @param {string} drawingId
	 */
	function handlePointerDown(e, drawingId) {
		if (nodesState.activeTool === 'eraser') {
			e.stopPropagation();
			nodesState.removeDrawing(drawingId);
		}
	}

</script>

<svg
	class="absolute top-0 left-0 w-1 h-1 overflow-visible z-0"
	style="pointer-events: {nodesState.activeTool === 'eraser' ? 'auto' : 'none'};"
>
	{#each nodesState.drawings as drawing (drawing.id)}
		<!-- Invisible fat stroke for easier erasing hitbox -->
		{#if nodesState.activeTool === 'eraser'}
			<path
				d={getBezierPath(drawing.points)}
				stroke="transparent"
				stroke-width={Math.max(drawing.width * 3, 20)}
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="cursor-crosshair"
				role="presentation"
				onpointerenter={(e) => handlePointerEnter(e, drawing.id)}
				onpointerdown={(e) => handlePointerDown(e, drawing.id)}
			/>
		{/if}
		
		<!-- Visible drawing path -->
		<path
			d={getBezierPath(drawing.points)}
			stroke={drawing.color}
			stroke-width={drawing.width}
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/each}
</svg>
