<script>
	import { nodesState } from "$lib/state/nodes.svelte.js";
	import { canvasState } from "$lib/state/canvas.svelte.js";

	let editingId = $state(null);
	let selectedId = $state(null);

	function handleBlur(annotation) {
		if (!annotation.text || annotation.text.trim() === '') {
			nodesState.removeTextAnnotation(annotation.id);
			selectedId = null;
		} else {
			nodesState.saveToStorage();
		}
		editingId = null;
	}

	function handleKeydown(e, annotation) {
		if (e.key === 'Escape') {
			e.target.blur();
			editingId = null;
		}
		if (e.key === 'Backspace' && (!annotation.text || annotation.text === '')) {
			e.preventDefault();
			nodesState.removeTextAnnotation(annotation.id);
			editingId = null;
			selectedId = null;
		}
		// Delete selected annotation
		if ((e.key === 'Delete' || (e.key === 'Backspace' && editingId !== annotation.id)) && selectedId === annotation.id) {
			nodesState.removeTextAnnotation(annotation.id);
			selectedId = null;
		}
	}

	function handlePointerDown(e, annotation) {
		e.stopPropagation();

		// If already editing this one, let textarea handle it
		if (editingId === annotation.id) return;

		selectedId = annotation.id;

		const startX = e.clientX;
		const startY = e.clientY;
		const initialX = annotation.x;
		const initialY = annotation.y;
		let isDragging = false;

		function move(ev) {
			if (!isDragging) {
				if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
					isDragging = true;
				}
			}
			if (isDragging) {
				const dx = (ev.clientX - startX) / canvasState.scale;
				const dy = (ev.clientY - startY) / canvasState.scale;
				annotation.x = initialX + dx;
				annotation.y = initialY + dy;
			}
		}

		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			if (isDragging) {
				nodesState.saveToStorage();
			} else {
				// Single click — enter edit mode
				editingId = annotation.id;
				setTimeout(() => {
					const el = document.querySelector(`[data-text-id="${annotation.id}"]`);
					if (el) el.focus();
				}, 0);
			}
		}

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	function handleResizeDown(e, annotation) {
		e.stopPropagation();
		e.preventDefault();

		const startX = e.clientX;
		const startY = e.clientY;
		const startFontSize = annotation.fontSize || 14;
		// Capture actual current width once at the start
		const domEl = document.querySelector(`[data-text-id="${annotation.id}"]`);
		const startWidth = annotation.width || (domEl?.offsetWidth || 100);

		function move(ev) {
			const dx = (ev.clientX - startX) / canvasState.scale;
			const dy = (ev.clientY - startY) / canvasState.scale;
			
			// Horizontal drag changes width
			if (Math.abs(dx) > 3) {
				annotation.width = Math.max(startWidth + dx, 50);
			}

			// Vertical drag changes font size
			if (Math.abs(dy) > 3) {
				annotation.fontSize = Math.max(Math.round(startFontSize + dy * 0.4), 8);
			}
		}

		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			nodesState.saveToStorage();
		}

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	function deleteAnnotation(e, id) {
		e.stopPropagation();
		nodesState.removeTextAnnotation(id);
		selectedId = null;
		editingId = null;
	}

	export function focusAnnotation(id) {
		editingId = id;
		selectedId = id;
		setTimeout(() => {
			const el = document.querySelector(`[data-text-id="${id}"]`);
			if (el) el.focus();
		}, 0);
	}
</script>

{#each nodesState.textAnnotations as annotation (annotation.id)}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute group/text"
		style="transform: translate({annotation.x}px, {annotation.y}px);"
		onpointerdown={(e) => handlePointerDown(e, annotation)}
	>
		<!-- Selection ring + controls (hover-revealed) -->
		<div class="absolute -inset-2 border border-dashed border-transparent group-hover/text:border-accent/40 rounded-sm pointer-events-none transition-colors"></div>

		<!-- Delete button -->
		<button
			class="absolute -top-3 -right-3 w-4 h-4 bg-surface border border-border rounded-full flex items-center justify-center text-text-secondary hover:text-red-400 hover:border-red-400 transition-all z-10 cursor-pointer opacity-0 group-hover/text:opacity-100"
			onpointerdown={(e) => deleteAnnotation(e, annotation.id)}
			title="Delete text"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
		</button>

		<!-- Resize handle (font size + width) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute -bottom-2 -right-2 w-3 h-3 bg-accent/60 border border-accent rounded-sm cursor-nwse-resize z-10 hover:bg-accent transition-all opacity-0 group-hover/text:opacity-100"
			onpointerdown={(e) => handleResizeDown(e, annotation)}
			title="Drag horizontal for width, vertical for font size"
		></div>

		<textarea
			data-text-id={annotation.id}
			class="bg-transparent border-none outline-none resize-none font-mono shadow-none p-1 m-0 overflow-hidden min-w-[3ch] whitespace-pre-wrap
				focus:ring-0
				{editingId === annotation.id ? 'bg-surface/20 backdrop-blur-sm' : ''}
				{selectedId === annotation.id && editingId !== annotation.id ? 'cursor-grab' : ''}"
			style="color: {annotation.color || 'var(--color-text-primary)'}; font-size: {annotation.fontSize || 14}px; width: {annotation.width ? annotation.width + 'px' : 'auto'}; min-height: 1em; field-sizing: content;"
			bind:value={annotation.text}
			onfocus={() => { editingId = annotation.id; selectedId = annotation.id; }}
			onblur={() => handleBlur(annotation)}
			onkeydown={(e) => handleKeydown(e, annotation)}
			oninput={() => nodesState.saveToStorage()}
			placeholder="Type..."
			rows="1"
			readonly={editingId !== annotation.id}
		></textarea>
	</div>
{/each}
