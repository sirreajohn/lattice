<script>
	import { nodesState } from "$lib/state/nodes.svelte.js";

	let { node } = $props();

	const COLORS = [
		{ id: "emerald", accent: "#10b981" },
		{ id: "ruby", accent: "#ef4444" },
		{ id: "sapphire", accent: "#3b82f6" },
		{ id: "amber", accent: "#f59e0b" },
		{ id: "rose", accent: "#f43f5e" },
		{ id: "slate", accent: "#64748b" },
	];
	const opcacity = "0F";

	let theme = $derived(
		COLORS.find((c) => c.id === (node.data.color || "emerald")) ||
			COLORS[0],
	);

	function deleteFrame(e) {
		e.stopPropagation();

		const frameW = node.width;
		const frameH = node.actualHeight || node.height || 400;

		const children = nodesState.nodes.filter(
			(n) =>
				n.id !== node.id &&
				n.x >= node.x &&
				n.y >= node.y &&
				n.x + (n.width || 0) <= node.x + frameW &&
				n.y + (n.actualHeight || n.height || 0) <= node.y + frameH,
		);

		const containedTexts = nodesState.textAnnotations.filter(
			(t) =>
				t.x >= node.x &&
				t.y >= node.y &&
				t.x + (t.width || 0) <= node.x + frameW &&
				t.y + (t.fontSize || 0) <= node.y + frameH,
		);

		const containedDrawings = nodesState.drawings.filter((d) =>
			d.points.every(
				(p) =>
					p.x >= node.x &&
					p.x <= node.x + frameW &&
					p.y >= node.y &&
					p.y <= node.y + frameH,
			),
		);

		const totalContained =
			children.length + containedTexts.length + containedDrawings.length;

		const msg =
			totalContained > 0
				? `Delete this frame and ${totalContained} contained items?`
				: `Delete this frame?`;

		if (confirm(msg)) {
			// Delete nodes
			for (const child of children) {
				nodesState.removeNode(child.id);
			}
			// Delete texts
			for (const text of containedTexts) {
				nodesState.removeTextAnnotation(text.id);
			}
			// Delete drawings
			for (const drawing of containedDrawings) {
				nodesState.removeDrawing(drawing.id);
			}
			// Delete frame itself
			nodesState.removeNode(node.id);
		}
	}

	function setFrameColor(colorId) {
		node.data.color = colorId;
		nodesState.saveToStorage();
	}
</script>

<div
	class="w-full h-full flex flex-col relative pointer-events-none group/frame rounded-none"
	style="background: {theme.accent}{opcacity}; border: 1px solid {theme.accent}30;"
>
	<!-- Header bar — macOS style -->
	<div
		class="relative flex items-center px-2 shrink-0 pointer-events-auto cursor-grab active:cursor-grabbing"
		style="height: 28px; background: {theme.accent}15; border-bottom: 1px solid {theme.accent}30;"
	>
		<!-- Left: traffic-light color dots -->
		{#if node.width > 320}
			<div
				class="flex items-center gap-1.5 opacity-30 group-hover/frame:opacity-100 transition-opacity z-10"
			>
				{#each COLORS as c}
					<button
						onclick={(e) => {
							e.stopPropagation();
							setFrameColor(c.id);
						}}
						class="w-2 h-2 rounded-full transition-all hover:scale-150"
						style="background: {c.accent}; {node.data.color === c.id
							? 'box-shadow: 0 0 5px ' +
								c.accent +
								'; outline: 1px solid rgba(255,255,255,0.4);'
							: ''}"
						title={c.id}
					></button>
				{/each}
			</div>
		{/if}

		<!-- Center: absolutely positioned title (narrow strip) -->
		<input
			type="text"
			bind:value={node.data.title}
			oninput={() => nodesState.saveToStorage()}
			class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 bg-transparent border-none font-mono text-[10px] font-bold uppercase tracking-[0.15em] focus:ring-0 outline-none text-center shadow-none"
			style="color: {theme.accent};"
			placeholder="FRAME"
		/>

		<!-- Right: delete -->
		<button
			class="ml-auto w-3 h-3 flex items-center justify-center opacity-0 group-hover/frame:opacity-100 transition-opacity cursor-pointer z-10"
			style="color: {theme.accent}80;"
			onclick={deleteFrame}
			title="Delete frame"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="8"
				height="8"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
			>
		</button>
	</div>

	<!-- Empty body for layout -->
	<div class="flex-1 w-full"></div>
</div>
