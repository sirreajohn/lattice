<script>
	import { canvasState } from '$lib/state/canvas.svelte.js';
	import { nodesState } from '$lib/state/nodes.svelte.js';
	import NoteNode from './NoteNode.svelte';
	import BoardNode from './BoardNode.svelte';
	import ColumnNode from './ColumnNode.svelte';
	import VideoNode from './VideoNode.svelte';
	import ImageNode from './ImageNode.svelte';
	import DocsNode from './DocsNode.svelte';
	import SheetNode from './SheetNode.svelte';
	import FrameNode from './FrameNode.svelte';

	let { node } = $props();

	let baseElement;
	let isNested = $derived(!!node.parentId);
	
	// Thresholding flag to prevent Svelte from opening "Edit" inputs natively after releasing the drag
	let dragJustFinished = false;

	function handlePointerDown(e) {
		if (e.button !== 0) return;
		if (['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName)) return;
		
		// Always use the OS header as a structural anchor.
		// If a Deck is filled, restrict dragging strictly to the OS header.
		if (node.type === 'column') {
			const hasChildren = nodesState.nodes.some(n => n.parentId === node.id);
			if (hasChildren && !e.target.closest('.os-header')) return;
		}

		// Prevent bubbled drag events so nested nodes don't drag the parent Deck
		e.stopPropagation();
		e.preventDefault();
		if (e.target && e.pointerId !== undefined) {
			e.target.setPointerCapture(e.pointerId);
		}
		
		nodesState.selectedNodeId = node.id;

		let isDragging = false;
		let startX = e.clientX;
		let startY = e.clientY;
		let activeInitialX = node.x;
		let activeInitialY = node.y;
		let childrenToMove = []; // Geometrically enclosed nodes
		let textsToMove = [];    // Geometrically enclosed texts
		let drawingsToMove = []; // Geometrically enclosed drawings

		function handlePointerMove(ev) {
			if (!isDragging) {
				if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
					isDragging = true;

					// If dragging a frame, cache all visually enclosed elements
					if (node.type === 'frame') {
						const frameW = node.width;
						const frameH = node.actualHeight || node.height || 400;
						
						// 1. Collect nodes
						childrenToMove = nodesState.nodes.filter(n => 
							n.id !== node.id && 
							n.x >= node.x && 
							n.y >= node.y && 
							n.x + (n.width || 0) <= node.x + frameW && 
							n.y + (n.actualHeight || n.height || 0) <= node.y + frameH
						).map(n => ({ id: n.id, initialX: n.x, initialY: n.y }));

						// 2. Collect text annotations
						textsToMove = nodesState.textAnnotations.filter(t => 
							t.x >= node.x && 
							t.y >= node.y && 
							t.x + (t.width || 0) <= node.x + frameW && 
							t.y + (t.fontSize || 0) <= node.y + frameH
						).map(t => ({ id: t.id, initialX: t.x, initialY: t.y }));

						// 3. Collect drawings (strict containment: all points must be inside)
						drawingsToMove = nodesState.drawings.filter(d => 
							d.points.every(p => 
								p.x >= node.x && p.x <= node.x + frameW &&
								p.y >= node.y && p.y <= node.y + frameH
							)
						).map(d => ({ 
							id: d.id, 
							initialPoints: d.points.map(p => ({ x: p.x, y: p.y })) 
						}));
					}
					
					// Pop Logic fires exactly when drag officially breaks the 3px threshold
					if (node.parentId) {
						if (baseElement) {
							const rect = baseElement.getBoundingClientRect();
							const canvasPos = canvasState.screenToCanvas(rect.left, rect.top);
							nodesState.updateNodePosition(node.id, canvasPos.x, canvasPos.y);
						}
						nodesState.updateNodeParent(node.id, null);
					}
					
					activeInitialX = node.x;
					activeInitialY = node.y;
					startX = ev.clientX;
					startY = ev.clientY;
				}
			}

			if (isDragging) {
				const dx = (ev.clientX - startX) / canvasState.scale;
				const dy = (ev.clientY - startY) / canvasState.scale;
				nodesState.updateNodePosition(node.id, activeInitialX + dx, activeInitialY + dy);
				
				// Move geometrically contained children if dragging a frame
				for (const child of childrenToMove) {
					nodesState.updateNodePosition(child.id, child.initialX + dx, child.initialY + dy);
				}

				// Move text annotations
				for (const text of textsToMove) {
					const t = nodesState.textAnnotations.find(ta => ta.id === text.id);
					if (t) {
						t.x = text.initialX + dx;
						t.y = text.initialY + dy;
					}
				}

				// Move drawings by shifting every point
				for (const drawing of drawingsToMove) {
					const d = nodesState.drawings.find(dr => dr.id === drawing.id);
					if (d) {
						d.points = drawing.initialPoints.map(p => ({
							x: p.x + dx,
							y: p.y + dy
						}));
					}
				}
			}
		}

		function handlePointerUp(ev) {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);

			if (isDragging) {
				dragJustFinished = true;
				setTimeout(() => dragJustFinished = false, 50);

				// Snapping into a Deck
				if (node.type !== 'column') {
					const elements = document.elementsFromPoint(ev.clientX, ev.clientY);
					const deckElement = elements.find(el => el.classList.contains('lattice-deck'));
					
					if (deckElement) {
						const deckId = deckElement.getAttribute('data-column-id');
						if (deckId !== node.id) {
							nodesState.updateNodeParent(node.id, deckId);
						}
					}
				}
			}
		}

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
	}

	function handleResizeDown(e) {
		e.stopPropagation();
		e.preventDefault();
		if (e.target && e.pointerId !== undefined) {
			e.target.setPointerCapture(e.pointerId);
		}
		let startX = e.clientX;
		let startY = e.clientY;
		let startW = node.width === 'auto' ? baseElement.offsetWidth : node.width;
		let startH = node.height === 'auto' ? baseElement.offsetHeight : node.height;

		function move(ev) {
			const dx = (ev.clientX - startX) / canvasState.scale;
			const dy = (ev.clientY - startY) / canvasState.scale;
			
			node.width = Math.max(startW + dx, 150);
			node.height = Math.max(startH + dy, 50);
			nodesState.saveToStorage();
		}

		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	/** 
	 * @param {PointerEvent} ev 
	 * @param {string} port 
	 */
	function handleAnchorPointerDown(ev, port) {
		ev.stopPropagation();
		ev.preventDefault();
		if (ev.target && ev.pointerId !== undefined) {
			ev.target.setPointerCapture(ev.pointerId);
		}
		const startCanvasPos = canvasState.screenToCanvas(ev.clientX, ev.clientY);
		nodesState.draftConnection = { fromId: node.id, fromPort: port, endX: startCanvasPos.x, endY: startCanvasPos.y, targetNodeId: null, targetPort: null };

		function move(ev) {
			const currentCanvasPos = canvasState.screenToCanvas(ev.clientX, ev.clientY);
			
			// Dynamic magnetic snap tracking
			const elements = document.elementsFromPoint(ev.clientX, ev.clientY);
			const targetNodeEl = elements.find(el => el.hasAttribute('data-node-id'));
			
			let candidateId = null;
			let candidatePort = null;

			if (targetNodeEl) {
				const toId = targetNodeEl.getAttribute('data-node-id');
				if (toId && toId !== node.id) {
					candidateId = toId;
					const rect = targetNodeEl.getBoundingClientRect();
					const ports = [
						{ id: 'top', x: rect.left + rect.width / 2, y: rect.top + 14 },
						{ id: 'right', x: rect.right, y: rect.top + rect.height / 2 },
						{ id: 'bottom', x: rect.left + rect.width / 2, y: rect.bottom },
						{ id: 'left', x: rect.left, y: rect.top + rect.height / 2 }
					];
					
					const taken = nodesState.connections.reduce((acc, c) => {
						if (c.from === toId) acc.push(c.fromPort);
						if (c.to === toId) acc.push(c.toPort);
						return acc;
					}, []);
		
					const avail = ports.filter(p => !taken.includes(p.id));
					if (avail.length > 0) {
						candidatePort = avail.sort((a,b) => {
							const da = Math.pow(a.x - ev.clientX, 2) + Math.pow(a.y - ev.clientY, 2);
							const db = Math.pow(b.x - ev.clientX, 2) + Math.pow(b.y - ev.clientY, 2);
							return da - db;
						})[0].id;
					}
				}
			}

			nodesState.draftConnection = { 
				...nodesState.draftConnection, 
				endX: currentCanvasPos.x, 
				endY: currentCanvasPos.y,
				targetNodeId: candidateId,
				targetPort: candidatePort
			};
		}

		function up(ev) {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			
			const draft = nodesState.draftConnection;
			if (draft && draft.targetNodeId && draft.targetPort) {
				nodesState.addConnection(node.id, port, draft.targetNodeId, draft.targetPort);
			}
			nodesState.draftConnection = null;
		}

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	const typeConfig = {
		note: NoteNode,
		board: BoardNode,
		column: ColumnNode,
		video: VideoNode,
		image: ImageNode,
		docs: DocsNode,
		sheet: SheetNode,
		frame: FrameNode
	};

	let NodeComponent = $derived(
		node.type === 'docs' && node.data?.type === 'spreadsheet' 
		? SheetNode 
		: typeConfig[node.type]
	);
	
	let isTopTarget = $derived(nodesState.draftConnection?.targetNodeId === node.id && nodesState.draftConnection?.targetPort === 'top');
	let isBottomTarget = $derived(nodesState.draftConnection?.targetNodeId === node.id && nodesState.draftConnection?.targetPort === 'bottom');
	let isLeftTarget = $derived(nodesState.draftConnection?.targetNodeId === node.id && nodesState.draftConnection?.targetPort === 'left');
	let isRightTarget = $derived(nodesState.draftConnection?.targetNodeId === node.id && nodesState.draftConnection?.targetPort === 'right');

	let parentNode = $derived(node.parentId ? nodesState.nodes.find(n => n.id === node.parentId) : null);

	// Sync absolute canvas position for nested nodes so connection lines can track them
	$effect(() => {
		if (isNested && baseElement && parentNode) {
			// Access parent coordinates to trigger re-calculation when deck moves
			const _px = parentNode.x;
			const _py = parentNode.y;

			const canvasDiv = document.querySelector('.canvas-content');
			if (canvasDiv) {
				const rect = baseElement.getBoundingClientRect();
				const cRect = canvasDiv.getBoundingClientRect();
				const newX = (rect.left - cRect.left) / canvasState.scale;
				const newY = (rect.top - cRect.top) / canvasState.scale;
				
				// Only update if changed by more than a sub-pixel to avoid chatter
				if (Math.abs(node.x - newX) > 0.01 || Math.abs(node.y - newY) > 0.01) {
					node.x = newX;
					node.y = newY;
				}
			}
		}
	});
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	bind:this={baseElement}
	bind:clientWidth={node.actualWidth}
	bind:clientHeight={node.actualHeight}
	data-node-id={node.id}
	class="group transition-shadow outline-none flex flex-col overflow-hidden select-text {node.type === 'frame' ? (nodesState.selectedNodeId === node.id ? 'z-[5] pointer-events-none' : 'z-0 pointer-events-none') : (nodesState.selectedNodeId === node.id ? 'ring-1 ring-[var(--color-accent)] z-20 pointer-events-auto' : 'z-10 pointer-events-auto')} {isNested ? 'relative' : 'absolute'} {node.type === 'frame' ? 'bg-transparent border-0 shadow-none' : 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg shadow-black/50'}"
	style="
		{isNested ? '' : `transform: translate(${node.x}px, ${node.y}px);`} 
		width: {isNested ? '100%' : node.width + 'px'}; 
		height: {node.height === 'auto' ? 'auto' : node.height + 'px'};
	"
	onpointerdown={handlePointerDown}
	onclickcapture={(e) => { if (dragJustFinished) { e.stopPropagation(); } }}
	role="button"
>
	{#if node.type !== 'frame'}
		<!-- OS UI Top Bar -->
		<div class="os-header h-[14px] w-full bg-[#111] border-b border-[var(--color-border)] flex items-center justify-between px-2 cursor-grab active:cursor-grabbing shrink-0 z-20">
			<div class="flex gap-1 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">
				<div class="w-1.5 h-1.5 rounded-full bg-[#ff5f56]"></div>
				<div class="w-1.5 h-1.5 rounded-full bg-[#ffbd2e]"></div>
				<div class="w-1.5 h-1.5 rounded-full bg-[#27c93f]"></div>
			</div>
			<button 
				class="w-3 h-3 text-[var(--color-text-secondary)] hover:text-red-400 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-auto"
				onclick={(e) => { e.stopPropagation(); nodesState.removeNode(node.id); }}
				title="Delete node"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
			</button>
		</div>
	{/if}

	<!-- Node Specific Content -->
	<div class="flex-1 w-full h-[calc(100%-14px)] relative {node.type === 'column' ? 'flex flex-col' : ''}">
		{#if NodeComponent}
			<NodeComponent {node} />
		{:else}
			<div class="p-4 text-red-500">Unknown node type: {node.type}</div>
		{/if}
	</div>

	{#if node.type !== 'frame'}
		<!-- Connection Anchor UI Top (Semi-circle clipped by OS header Z-index) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="absolute top-[6px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full cursor-crosshair transition-all shadow border border-[var(--color-surface)] z-10 
			{isTopTarget ? 'bg-[var(--color-accent)] opacity-100 scale-150 ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-surface)]' : 'bg-[var(--color-border)] opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[var(--color-accent)]'}"
			onpointerdown={(e) => handleAnchorPointerDown(e, 'top')}
		></div>

		<!-- Connection Anchor UI Bottom -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full cursor-crosshair transition-all shadow border border-[var(--color-surface)] z-10 
			{isBottomTarget ? 'bg-[var(--color-accent)] opacity-100 scale-150 ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-surface)]' : 'bg-[var(--color-border)] opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[var(--color-accent)]'}"
			onpointerdown={(e) => handleAnchorPointerDown(e, 'bottom')}
		></div>

		<!-- Connection Anchor UI Left -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-crosshair transition-all shadow border border-[var(--color-surface)] z-10 
			{isLeftTarget ? 'bg-[var(--color-accent)] opacity-100 scale-150 ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-surface)]' : 'bg-[var(--color-border)] opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[var(--color-accent)]'}"
			onpointerdown={(e) => handleAnchorPointerDown(e, 'left')}
		></div>

		<!-- Connection Anchor UI Right -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-crosshair transition-all shadow border border-[var(--color-surface)] z-10 
			{isRightTarget ? 'bg-[var(--color-accent)] opacity-100 scale-150 ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-surface)]' : 'bg-[var(--color-border)] opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[var(--color-accent)]'}"
			onpointerdown={(e) => handleAnchorPointerDown(e, 'right')}
		></div>
	{/if}

	<!-- Resize UI Handle -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-auto"
		onpointerdown={handleResizeDown}
	>
		<div class="absolute bottom-1 right-1 w-2 h-2 opacity-30 text-[var(--color-text-secondary)]">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v6h-6"/><path d="M21 21l-7-7"/><path d="M15 3h6v6"/><path d="M21 3l-7 7"/><path d="M9 21H3v-6"/><path d="M3 21l7-7"/><path d="M3 9V3h6"/><path d="M3 3l7 7"/></svg>
		</div>
	</div>
</div>
