<script lang="js">
	import { canvasState } from "$lib/state/canvas.svelte.js";
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import BaseNode from "$lib/nodes/BaseNode.svelte";
	import ConnectionLines from "./ConnectionLines.svelte";
	import CanvasDrawings from "./CanvasDrawings.svelte";
	import CanvasTexts from "./CanvasTexts.svelte";
	import ContextMenu from "$lib/ui/ContextMenu.svelte";
	import { openContextMenu } from "$lib/state/contextMenu.svelte.js";
	import { processDroppedFile } from "$lib/utils/docs.js";

	let { children } = $props();
	/** @type {HTMLDivElement} */
	// @ts-ignore
	let canvasElement = $state();
	/** @type {string | null} */
	let activeDrawingId = $state(null);
	/** @type {ReturnType<typeof CanvasTexts> | null} */
	let canvasTextsRef = $state(null);
	
	/** @type {{startX: number, startY: number, currentX: number, currentY: number} | null} */
	let selectionBox = $state(null);

	/** @param {PointerEvent} e */
	function handlePointerDown(e) {
		// 1. Allow interacting with inputs, textareas, or things that are contenteditable.
		const target = /** @type {HTMLElement} */ (e.target);
		if (
			target &&
			(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(
				target.tagName,
			) ||
				target.closest("[contenteditable]"))
		) {
			return;
		}

		const isLeftClick = e.button === 0;

		// Drawing logic
		if (nodesState.activeTool === "pencil" && isLeftClick) {
			nodesState.selectedNodeId = null;
			const canvasPos = canvasState.screenToCanvas(e.clientX, e.clientY);
			activeDrawingId = crypto.randomUUID();

			const newDrawing = {
				id: activeDrawingId,
				color: nodesState.drawingColor,
				width: nodesState.drawingWidth,
				points: [canvasPos],
			};
			nodesState.addDrawing(newDrawing);

			/** @param {PointerEvent} ev */
			function handlePencilMove(ev) {
				const pt = canvasState.screenToCanvas(ev.clientX, ev.clientY);
				const d = nodesState.drawings.find(
					(d) => d.id === activeDrawingId,
				);
				if (d) {
					d.points.push(pt);
				}
			}

			function handlePencilUp() {
				nodesState.saveToStorage();
				window.removeEventListener("pointermove", handlePencilMove);
				window.removeEventListener("pointerup", handlePencilUp);
				activeDrawingId = null;
			}

			window.addEventListener("pointermove", handlePencilMove);
			window.addEventListener("pointerup", handlePencilUp);
			return;
		}

		if (nodesState.activeTool === "eraser") {
			return;
		}

		// Text tool: click to place a new text annotation
		if (nodesState.activeTool === "text" && isLeftClick) {
			nodesState.selectedNodeId = null;
			const canvasPos = canvasState.screenToCanvas(e.clientX, e.clientY);
			const newId = crypto.randomUUID();
			nodesState.addTextAnnotation({
				id: newId,
				x: canvasPos.x,
				y: canvasPos.y,
				text: "",
				color: "var(--color-text-primary)",
				fontSize: 14,
			});
			// Focus the new annotation
			if (canvasTextsRef) {
				canvasTextsRef.focusAnnotation(newId);
			}
			return;
		}

		// 2. If clicking on something that bubbled here (not caught by nodes)
		// and it's specifically the canvas background, deselect and blur.
		if (e.target === canvasElement) {
			const activeEl = /** @type {HTMLElement} */ (
				document.activeElement
			);
			if (activeEl && typeof activeEl.blur === "function") {
				activeEl.blur();
			}
			if (e.button === 0) {
				nodesState.clearSelection();
			}
		}

		if (e.button === 1 || e.altKey || e.button === 2) { // Middle click or Alt + Drag or Right Click drag for pan? Wait, right click is context menu.
			// Let's stick to Option A: Middle click or Alt.
		}
		if (e.button === 1 || e.altKey) {
			e.preventDefault();
			const startX = e.clientX;
			const startY = e.clientY;
			const initialCanvasX = canvasState.x;
			const initialCanvasY = canvasState.y;

			/** @param {PointerEvent} ev */
			function handlePointerMove(ev) {
				canvasState.x = initialCanvasX + (ev.clientX - startX);
				canvasState.y = initialCanvasY + (ev.clientY - startY);
			}

			function handlePointerUp() {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
			}

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp);
			return;
		}

		// Option A marquee selection (Left-Click Drag on background)
		if (e.button === 0 && e.target === canvasElement && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
			e.preventDefault();
			
			const startX = e.clientX;
			const startY = e.clientY;
			
			selectionBox = { startX, startY, currentX: startX, currentY: startY };

			function handleMarqueeMove(ev) {
				selectionBox.currentX = ev.clientX;
				selectionBox.currentY = ev.clientY;
			}

			function handleMarqueeUp(ev) {
				window.removeEventListener("pointermove", handleMarqueeMove);
				window.removeEventListener("pointerup", handleMarqueeUp);
				
				if (selectionBox) {
					const dx = Math.abs(selectionBox.currentX - selectionBox.startX);
					const dy = Math.abs(selectionBox.currentY - selectionBox.startY);
					
					if (dx > 5 || dy > 5) {
						nodesState.clearSelection();
						
						const minScreenX = Math.min(selectionBox.startX, selectionBox.currentX);
						const maxScreenX = Math.max(selectionBox.startX, selectionBox.currentX);
						const minScreenY = Math.min(selectionBox.startY, selectionBox.currentY);
						const maxScreenY = Math.max(selectionBox.startY, selectionBox.currentY);
						
						const startCanvasPos = canvasState.screenToCanvas(minScreenX, minScreenY);
						const endCanvasPos = canvasState.screenToCanvas(maxScreenX, maxScreenY);

						for (const node of nodesState.nodes) {
							if (node.parentId) continue; // Don't select nested directly
							const nodeRight = node.x + (node.actualWidth || node.width || 150);
							const nodeBottom = node.y + (node.actualHeight || node.height || 100);
							
							// AABB intersection
							if (startCanvasPos.x < nodeRight && 
								endCanvasPos.x > node.x && 
								startCanvasPos.y < nodeBottom && 
								endCanvasPos.y > node.y) {
								nodesState.selectNode(node.id, true);
							}
						}
					}
				}
				selectionBox = null;
			}

			window.addEventListener("pointermove", handleMarqueeMove);
			window.addEventListener("pointerup", handleMarqueeUp);
		}
	}

	/** @param {WheelEvent} e */
	function handleWheel(e) {
		if (!e.ctrlKey && !e.metaKey) {
			return;
		}

		e.preventDefault();
		const zoomFactor = 1.05;
		const direction = e.deltaY > 0 ? -1 : 1;
		const scaleChange = direction > 0 ? zoomFactor : 1 / zoomFactor;

		const rect = canvasElement.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		const newScale = Math.min(
			Math.max(canvasState.scale * scaleChange, 0.1),
			5,
		);
		const actualScaleChange = newScale / canvasState.scale;

		canvasState.x = mouseX - (mouseX - canvasState.x) * actualScaleChange;
		canvasState.y = mouseY - (mouseY - canvasState.y) * actualScaleChange;
		canvasState.scale = newScale;
	}

	/**
	 * @param {File} file
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} isScreenPos
	 */
	function processImageFile(file, x, y, isScreenPos) {
		const reader = new FileReader();
		/** @param {any} event */
		reader.onload = (event) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;
				const MAX_DIM = 1024;

				if (width > MAX_DIM || height > MAX_DIM) {
					if (width > height) {
						height = Math.round(height * (MAX_DIM / width));
						width = MAX_DIM;
					} else {
						width = Math.round(width * (MAX_DIM / height));
						height = MAX_DIM;
					}
				}

				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.drawImage(img, 0, 0, width, height);
				}

				const dataUrl = canvas.toDataURL("image/webp", 0.8);

				let nodeW = width;
				let nodeH = height;
				if (nodeW > 400) {
					nodeH = Math.round(height * (400 / width));
					nodeW = 400;
				}

				let finalX = x;
				let finalY = y;
				if (isScreenPos) {
					const canvasPos = canvasState.screenToCanvas(x, y);
					finalX = canvasPos.x;
					finalY = canvasPos.y;
				}

				const id = nodesState.addNode("image", finalX, finalY, {
					src: dataUrl,
					alt: file.name || "Pasted Image",
				});
				const node = nodesState.nodes.find((n) => n.id === id);
				if (node) {
					node.width = nodeW;
					node.height = nodeH;
					nodesState.saveToStorage();
				}
			};
			img.src = event.target.result;
		};
		reader.readAsDataURL(file);
	}

	/** @param {DragEvent} e */
	function handleDrop(e) {
		e.preventDefault();
		if (e.dataTransfer && e.dataTransfer.files) {
			for (let i = 0; i < e.dataTransfer.files.length; i++) {
				const file = e.dataTransfer.files[i];
				if (file.type.startsWith("image/")) {
					processImageFile(file, e.clientX, e.clientY, true);
					break;
				} else {
					processDroppedFile(file).then((payload) => {
						if (payload) {
							const canvasPos = canvasState.screenToCanvas(
								e.clientX,
								e.clientY,
							);
							const id = nodesState.addNode(
								"docs",
								canvasPos.x,
								canvasPos.y,
								payload,
							);
							const node = nodesState.nodes.find(
								(n) => n.id === id,
							);
							if (node) {
								node.width = 400;
								node.height = 500;
								nodesState.saveToStorage();
							}
						}
					});
				}
			}
		}
	}

	/** @param {ClipboardEvent} e */
	function handlePaste(e) {
		if (
			document.activeElement &&
			["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
		)
			return;
		if (e.clipboardData && e.clipboardData.items) {
			for (let i = 0; i < e.clipboardData.items.length; i++) {
				const item = e.clipboardData.items[i];
				if (item.kind === "file" && item.type.startsWith("image/")) {
					const blob = item.getAsFile();
					if (blob) {
						processImageFile(
							blob,
							window.innerWidth / 2,
							window.innerHeight / 2,
							true,
						);
						break;
					}
				}
			}
		}
	}
</script>

<svelte:window onpaste={handlePaste} />

<div
	bind:this={canvasElement}
	onpointerdown={handlePointerDown}
	onwheel={handleWheel}
	ondragover={(e) => e.preventDefault()}
	ondrop={handleDrop}
	oncontextmenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, 'canvas'); }}
	class="w-full h-screen relative overflow-hidden text-[var(--color-text-primary)] bg-[var(--color-canvas)] select-none touch-none"
	role="application"
	aria-label="Infinite Canvas"
	style="
		background-image: radial-gradient(var(--color-border) 1.5px, transparent 1.5px);
		background-position: {canvasState.x}px {canvasState.y}px;
		background-size: {30 * canvasState.scale}px {30 * canvasState.scale}px;
		cursor: {nodesState.activeTool === 'pencil' ||
	nodesState.activeTool === 'eraser'
		? 'crosshair'
		: nodesState.activeTool === 'text'
			? 'text'
			: 'default'};
	"
>
	<div
		class="absolute top-0 left-0 w-0 h-0 overflow-visible origin-top-left canvas-content"
		style="transform: translate({canvasState.x}px, {canvasState.y}px) scale({canvasState.scale})"
	>
		<CanvasDrawings />
		<CanvasTexts bind:this={canvasTextsRef} />
		<ConnectionLines />
		{#each nodesState.nodes.filter((n) => !n.parentId) as node (node.id)}
			<BaseNode {node} />
		{/each}
	</div>

	{#if children}
		{@render children()}
	{/if}

	{#if selectionBox}
		<div
			class="fixed pointer-events-none z-[100] border border-[var(--color-accent)] bg-[var(--color-accent)]/10"
			style="
				left: {Math.min(selectionBox.startX, selectionBox.currentX)}px;
				top: {Math.min(selectionBox.startY, selectionBox.currentY)}px;
				width: {Math.abs(selectionBox.currentX - selectionBox.startX)}px;
				height: {Math.abs(selectionBox.currentY - selectionBox.startY)}px;
			"
		></div>
	{/if}

	<ContextMenu />

	{#if nodesState.isFetching}
		<div
			class="absolute inset-0 z-[100] flex items-center justify-center bg-[var(--color-canvas)]/90 backdrop-blur-md pointer-events-auto cursor-wait select-none"
		>
			<div class="flex flex-col items-center gap-6">
				<!-- Terminal-style loading square -->
				<div class="relative w-12 h-12">
					<div
						class="absolute inset-0 border-2 border-[var(--color-lines)]/30"
					></div>
					<div
						class="absolute inset-0 border-t-2 border-[var(--color-lines)] animate-spin [animation-duration:1.5s]"
					></div>
					<div
						class="absolute inset-0 flex items-center justify-center"
					>
						<div
							class="w-2 h-2 bg-[var(--color-lines)] animate-pulse"
						></div>
					</div>
				</div>

				<div class="flex flex-col items-center gap-2">
					<div
						class="text-[var(--color-lines)] font-mono text-xs tracking-[0.2em] uppercase opacity-80"
					>
						Loading Board...
					</div>
					<div
						class="flex items-center gap-1 font-mono text-[var(--color-text-secondary)] text-[10px]"
					>
						<span>Syncing board state</span>
						<span class="animate-pulse">_</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
