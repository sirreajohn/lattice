<script lang="js">
	import { canvasState } from "$lib/state/canvas.svelte.js";
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import BaseNode from "$lib/nodes/BaseNode.svelte";
	import ConnectionLines from "./ConnectionLines.svelte";
	import CanvasDrawings from "./CanvasDrawings.svelte";
	import { processDroppedFile } from "$lib/utils/docs.js";

	let { children } = $props();
	/** @type {HTMLDivElement} */
	// @ts-ignore
	let canvasElement = $state();
	/** @type {string | null} */
	let activeDrawingId = $state(null);

	/** @param {PointerEvent} e */
	function handlePointerDown(e) {
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
			// Eraser click-and-drag logic is largely handled natively by CanvasDrawings onpointerenter
			// We just skip panning
			return;
		}

		nodesState.selectedNodeId = null;

		if (e.button === 0 || e.button === 1 || e.altKey) {
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
		: 'default'};
	"
>
	<div
		class="absolute top-0 left-0 w-0 h-0 overflow-visible origin-top-left"
		style="transform: translate({canvasState.x}px, {canvasState.y}px) scale({canvasState.scale})"
	>
		<CanvasDrawings />
		<ConnectionLines />
		{#each nodesState.nodes.filter((n) => !n.parentId) as node (node.id)}
			<BaseNode {node} />
		{/each}
	</div>

	{#if children}
		{@render children()}
	{/if}
</div>
