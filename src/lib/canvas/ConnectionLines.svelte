<script>
	import { nodesState } from "$lib/state/nodes.svelte.js";

	function getNodeRect(id) {
		const node = nodesState.nodes.find((n) => n.id === id);
		if (!node) return null;
		
		// Prefer the natively bound runtime DOM dimensions over hardcoded defaults
		let w = node.actualWidth || (node.width === 'auto' ? 250 : (node.width || 250));
		let h = node.actualHeight || (node.height === 'auto' ? 150 : (node.height || 150));
		
		return { x: node.x, y: node.y, w, h };
	}

	function getSpecificPort(id, port) {
		const rect = getNodeRect(id);
		if (!rect) return null;
		
		switch (port) {
			case 'top': return { x: rect.x + rect.w / 2, y: rect.y + 14 };
			case 'right': return { x: rect.x + rect.w, y: rect.y + rect.h / 2 };
			case 'bottom': return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
			case 'left': return { x: rect.x, y: rect.y + rect.h / 2 };
		}
		return null;
	}

	function getControlPoint(pt, port, tension = 100) {
		if (!pt || !port) return pt;
		switch (port) {
			case 'top': return { x: pt.x, y: pt.y - tension };
			case 'right': return { x: pt.x + tension, y: pt.y };
			case 'bottom': return { x: pt.x, y: pt.y + tension };
			case 'left': return { x: pt.x - tension, y: pt.y };
		}
		return pt;
	}

	// Cubic bezier midpoint at t=0.5
	function bezierMidpoint(p0, cp1, cp2, p1) {
		const t = 0.5;
		const mt = 1 - t;
		return {
			x: mt*mt*mt*p0.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*p1.x,
			y: mt*mt*mt*p0.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*p1.y
		};
	}

	// Track which connection is being edited right now
	let editingId = $state(null);
	let editingValue = $state('');

	function startEdit(conn) {
		editingId = conn.id;
		editingValue = conn.label || '';
	}

	function commitEdit(conn) {
		nodesState.updateConnectionLabel(conn.id, editingValue.trim());
		editingId = null;
	}

	function handleLabelKeyDown(e, conn) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitEdit(conn);
		} else if (e.key === 'Escape') {
			editingId = null;
		}
	}
</script>

<svg
	class="absolute top-0 left-0 w-1 h-1 overflow-visible pointer-events-none z-0"
>
	<defs>
		<marker
			id="arrowhead"
			markerWidth="10"
			markerHeight="7"
			refX="9"
			refY="3.5"
			orient="auto"
		>
			<polygon points="0 0, 10 3.5, 0 7" fill="var(--color-lines, var(--color-border))" />
		</marker>
		<marker
			id="arrowhead-draft"
			markerWidth="10"
			markerHeight="7"
			refX="9"
			refY="3.5"
			orient="auto"
		>
			<polygon points="0 0, 10 3.5, 0 7" fill="var(--color-accent)" />
		</marker>
	</defs>

	{#each nodesState.connections as conn (conn.id)}
		{@const fromPt = getSpecificPort(conn.from, conn.fromPort || 'right')}
		{@const toPt = getSpecificPort(conn.to, conn.toPort || 'left')}

		{#if fromPt && toPt}
			{@const cp1 = getControlPoint(fromPt, conn.fromPort || 'right')}
			{@const cp2 = getControlPoint(toPt, conn.toPort || 'left')}
			{@const mid = bezierMidpoint(fromPt, cp1, cp2, toPt)}
			
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g class="group pointer-events-auto">
				<!-- Invisible fat path — dblclick to delete, single click passes through to label -->
				<path
					d="M {fromPt.x} {fromPt.y} C {cp1.x} {cp1.y}, {cp2.x} {cp2.y}, {toPt.x} {toPt.y}"
					stroke="transparent"
					stroke-width="20"
					fill="none"
					class="cursor-pointer"
					ondblclick={() => nodesState.removeConnection(conn.id)}
				/>
				<!-- Visible line -->
				<path
					d="M {fromPt.x} {fromPt.y} C {cp1.x} {cp1.y}, {cp2.x} {cp2.y}, {toPt.x} {toPt.y}"
					stroke="var(--color-lines, var(--color-border))"
					stroke-width="2"
					fill="none"
					marker-end="url(#arrowhead)"
					class="transition-colors group-hover:stroke-red-400 pointer-events-none"
				/>

				<!-- Label at bezier midpoint — always-clickable hitbox + label rendering -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					onclick={(e) => { e.stopPropagation(); startEdit(conn); }}
					class="cursor-text"
				>
					<!-- Permanent invisible click target at midpoint (always hittable) -->
					<circle cx={mid.x} cy={mid.y} r="20" fill="transparent" />
					{#if editingId === conn.id}
						<!-- Inline editor -->
						<foreignObject
							x={mid.x - 60}
							y={mid.y - 14}
							width="120"
							height="28"
						>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								autofocus
								type="text"
								bind:value={editingValue}
								onblur={() => commitEdit(conn)}
								onkeydown={(e) => handleLabelKeyDown(e, conn)}
								onclick={(e) => e.stopPropagation()}
								style="
									width: 100%;
									height: 100%;
									background: var(--color-surface);
									color: var(--color-text-primary);
									border: 1.5px solid var(--color-accent);
									border-radius: 999px;
									padding: 0 10px;
									font-size: 11px;
									text-align: center;
									outline: none;
									box-shadow: 0 2px 8px rgba(0,0,0,0.3);
								"
							/>
						</foreignObject>
					{:else if conn.label}
						<!-- Static pill label — always visible if labelled -->
						<rect
							x={mid.x - (conn.label.length * 3.5 + 12)}
							y={mid.y - 11}
							width={conn.label.length * 7 + 24}
							height="22"
							rx="11"
							ry="11"
							fill="var(--color-surface)"
							stroke="var(--color-border)"
							stroke-width="1"
						/>
						<text
							x={mid.x}
							y={mid.y + 4}
							text-anchor="middle"
							font-size="11"
							fill="var(--color-text-secondary)"
							font-family="inherit"
						>{conn.label}</text>
					{:else}
						<!-- Ghost hint on hover: "+ label" -->
						<text
							x={mid.x}
							y={mid.y + 4}
							text-anchor="middle"
							font-size="10"
							fill="var(--color-text-secondary)"
							font-family="inherit"
							class="opacity-0 group-hover:opacity-40 transition-opacity"
							pointer-events="none"
						>+ label</text>
					{/if}
				</g>
			</g>
		{/if}
	{/each}

	{#if nodesState.draftConnection}
		{@const startPt = getSpecificPort(nodesState.draftConnection.fromId, nodesState.draftConnection.fromPort || 'right')}
		{@const draft = nodesState.draftConnection}
		{#if startPt}
			{@const targetPt = (draft.targetNodeId && draft.targetPort) ? getSpecificPort(draft.targetNodeId, draft.targetPort) : { x: draft.endX, y: draft.endY }}
			{@const cp1 = getControlPoint(startPt, draft.fromPort || 'right')}
			{@const cp2 = (draft.targetNodeId && draft.targetPort) ? getControlPoint(targetPt, draft.targetPort) : targetPt}
			
			<!-- Invisible snapping outline -->
			<path
				d="M {startPt.x} {startPt.y} C {cp1.x} {cp1.y}, {cp2.x} {cp2.y}, {targetPt.x} {targetPt.y}"
				stroke="var(--color-accent)"
				stroke-width="2"
				stroke-dasharray="4"
				fill="none"
				marker-end="url(#arrowhead-draft)"
			/>
		{/if}
	{/if}
</svg>
