<script>
	import {
		contextMenuState,
		closeContextMenu,
	} from "$lib/state/contextMenu.svelte.js";
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import { canvasState } from "$lib/state/canvas.svelte.js";
	import { fade } from "svelte/transition";

	const BTN_BASE =
		"flex items-center justify-between w-full text-left px-3 py-2 transition-colors cursor-pointer group";
	/** @type {Record<string, string>} */
	const CLASSES = {
		default: `${BTN_BASE} bg-transparent hover:bg-[var(--color-lines)] text-[var(--color-text-primary)] hover:text-black`,
		danger: `${BTN_BASE} bg-transparent hover:bg-red-500 text-red-400 hover:text-black`,
		ai: `${BTN_BASE} bg-[var(--color-lines)]/5 hover:bg-[var(--color-lines)] text-[var(--color-lines)] hover:text-black border border-[var(--color-lines)]/20 hover:border-transparent`,
	};

	/** @type {Record<string, string>} */
	const ICONS = {
		up: `<path d="M12 2v20"/><path d="m17 7-5-5-5 5"/>`,
		down: `<path d="M12 2v20"/><path d="m17 17-5 5-5-5"/>`,
		frame: `<rect width="18" height="18" x="3" y="3"/><path d="M3 9h18"/><path d="M9 21V9"/>`,
		copy: `<rect width="14" height="14" x="8" y="8"/><path d="M4 16V4h12"/>`,
		paste: `<rect width="8" height="4" x="8" y="2"/><path d="M16 4h2v16H6V4h2"/>`,
		trash: `<path d="M3 6h18"/><path d="M19 6v14H5V6"/><path d="M8 6V4h8v2"/>`,
		spark: `<path d="m12 3-1.9 5.8L3 12l5.8 1.9L12 21l1.9-5.8L21 12l-5.8-1.9Z"/>`,
		img: `<rect width="18" height="18" x="3" y="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086L6 21"/>`,
		grid: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>`,
	};

	function getTargetNodes() {
		const tid = contextMenuState.targetId;
		if (!tid) return [];
		return nodesState.isNodeSelected(tid)
			? nodesState.selectedNodeIds
					.map((id) => nodesState.nodes.find((n) => n.id === id))
					.filter(Boolean)
			: [nodesState.nodes.find((n) => n.id === tid)].filter(Boolean);
	}

	function run(/** @type {(t: any) => void} */ action, close = true) {
		getTargetNodes().forEach(action);
		if (close) {
			nodesState.clearSelection();
			closeContextMenu();
		}
	}

	function handleGroup() {
		const targets = getTargetNodes().filter((n) => n.type !== "frame");
		if (targets.length > 0) {
			const frames = nodesState.nodes.filter((n) => n.type === "frame");
			let insideFrame = false;
			for (const t of targets) {
				for (const f of frames) {
					const fh = f.actualHeight || f.height || 400;
					if (
						t.x >= f.x &&
						t.y >= f.y &&
						t.x + (t.actualWidth || t.width || 0) <=
							f.x + f.width &&
						t.y + (t.actualHeight || t.height || 0) <= f.y + fh
					) {
						insideFrame = true;
						break;
					}
				}
				if (insideFrame) break;
			}

			if (!insideFrame) {
				let minX = Infinity,
					minY = Infinity,
					maxX = -Infinity,
					maxY = -Infinity;
				for (const t of targets) {
					minX = Math.min(minX, t.x);
					minY = Math.min(minY, t.y);
					maxX = Math.max(
						maxX,
						t.x + (t.actualWidth || t.width || 250),
					);
					maxY = Math.max(
						maxY,
						t.y + (t.actualHeight || t.height || 150),
					);
				}
				const fid = nodesState.addNode("frame", minX - 20, minY - 40, {
					title: "New Group",
					color: "emerald",
				});
				const f = nodesState.nodes.find((n) => n.id === fid);
				if (f) {
					f.width = maxX - minX + 40;
					f.height = maxY - minY + 60;
					nodesState.sendToBack(fid);
				}
			}
		}
		nodesState.clearSelection();
		closeContextMenu();
	}

	function handleCopy() {
		const ids = getTargetNodes().map((n) => n.id);
		if (ids.length) nodesState.copyNodes(ids);
		closeContextMenu();
	}

	function handlePaste() {
		const p = canvasState.screenToCanvas(
			contextMenuState.x,
			contextMenuState.y,
		);
		nodesState.pasteNodes(p.x, p.y);
		closeContextMenu();
	}

	const menuItems = $derived.by(() => {
		if (contextMenuState.targetType === "node")
			return [
				{ type: "head", label: "Base Operations" },
				{
					label: "Bring to Front",
					icon: "up",
					click: () => run((t) => nodesState.bringToFront(t.id)),
				},
				{
					label: "Send to Back",
					icon: "down",
					click: () => run((t) => nodesState.sendToBack(t.id)),
				},
				{ label: "Wrap in Frame", icon: "frame", click: handleGroup },
				{ label: "Copy", icon: "copy", hint: "⌘C", click: handleCopy },
				...(nodesState._clipboard.length
					? [
							{
								label: "Paste",
								icon: "paste",
								hint: "⌘V",
								click: handlePaste,
							},
						]
					: []),

				{
					label: "Terminate Node",
					icon: "trash",
					hint: "X",
					variant: "danger",
					click: () => run((t) => nodesState.removeNode(t.id)),
				},
				{ type: "sep" },
				{ type: "head", label: "AI Features" },
				{
					label: "AI: Gen Image",
					icon: "img",
					hint: "*",
					variant: "ai",
					click: () => {
						alert("AI Features coming soon!");
						closeContextMenu();
					},
				},
			];
		if (contextMenuState.targetType === "canvas")
			return [
				{ type: "head", label: "Base Operations" },
				{ label: "Insert / Paste", icon: "paste", click: handlePaste },
				{ type: "sep" },
				{ type: "head", label: "AI Features" },
				{
					label: "AI: Cluster nodes",
					icon: "grid",
					hint: "*",
					variant: "ai",
					click: () => {
						alert("AI Features coming soon!");
						closeContextMenu();
					},
				},
			];
		return [];
	});
</script>

<svelte:window
	onpointerdown={(e) => {
		const target = /** @type {HTMLElement} */ (e.target);
		if (target && !target.closest(".context-menu")) closeContextMenu();
	}}
	onkeydown={(e) => e.key === "Escape" && closeContextMenu()}
/>

{#if contextMenuState.isVisible}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="context-menu fixed z-[999] bg-[#0a0a0a]/95 backdrop-blur-md border border-[var(--color-lines)]/40 shadow-[0_0_15px_rgba(60,222,36,0.1)] flex flex-col min-w-[220px] font-mono text-[11px] uppercase tracking-wider overflow-hidden select-none"
		role="menu"
		tabindex="-1"
		style="left: {contextMenuState.x}px; top: {contextMenuState.y}px;"
		transition:fade={{ duration: 100 }}
		oncontextmenu={(e) => {
			e.preventDefault();
			e.stopPropagation();
		}}
	>
		<div
			class="px-3 py-1 bg-[var(--color-lines)]/10 border-b border-[var(--color-lines)]/30 flex items-center justify-between"
		>
			<span class="text-[var(--color-lines)] opacity-80">SYS.MENU</span>
			<span class="text-[var(--color-text-secondary)] opacity-50">_</span>
		</div>

		<div class="p-1 flex flex-col gap-0.5">
			{#each menuItems as item}
				{#if item.type === "sep"}
					<div
						class="h-px w-full bg-[var(--color-border)] my-1"
					></div>
				{:else if item.type === "head"}
					<div
						class="px-3 py-1 text-[9px] text-[var(--color-text-secondary)] opacity-60"
					>
						{item.label}
					</div>
				{:else}
					<button
						class={CLASSES[item.variant || "default"]}
						onclick={item.click}
					>
						<span class="flex items-center gap-2">
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="square"
							>
								{@html ICONS[item.icon || "up"]}
							</svg>
							{item.label}
						</span>
						<span
							class="{item.variant === 'ai'
								? ''
								: 'opacity-0 group-hover:opacity-100'} {(item
								.hint?.length || 0) > 1
								? 'text-[9px] text-[var(--color-text-secondary)]'
								: 'font-bold'}"
						>
							{item.hint || ">"}
						</span>
					</button>
				{/if}
			{/each}
		</div>
	</div>
{/if}
