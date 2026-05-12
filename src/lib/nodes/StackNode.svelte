<script>
	import { nodesState } from '$lib/state/nodes.svelte.js';
	import NoteNode from './NoteNode.svelte';
	import BoardNode from './BoardNode.svelte';
	import ImageNode from './ImageNode.svelte';
	import VideoNode from './VideoNode.svelte';
	import DocsNode from './DocsNode.svelte';
	import SheetNode from './SheetNode.svelte';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { node } = $props();
	let isEditing = $state(false);
	let element = $state();
	let editingChild = $state(null);

	function handleInput(e) {
		nodesState.updateNodeData(node.id, { title: e.target.value });
	}

	function startEditing(e) {
		e.stopPropagation();
		isEditing = true;
		setTimeout(() => { if (element) element.focus(); }, 0);
	}

	let children = $derived(nodesState.nodes.filter(n => n.parentId === node.id));

	let renderedTitle = $derived(
		node.data.title 
			? DOMPurify.sanitize(marked.parseInline(node.data.title)) 
			: '<span class="opacity-50 text-[var(--color-text-secondary)]">Untitled Stack</span>'
	);

	/** @type {Record<string, string>} */
	const TYPE_ICONS = {
		note: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>',
		board: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>',
		image: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>',
		video: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="m10 11 5 3-5 3v-6Z" /></svg>',
		docs: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" /><path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z" /></svg>',
		sheet: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /></svg>',
	};

	/** @type {Record<string, any>} */
	const overlayComponents = {
		note: NoteNode,
		board: BoardNode,
		image: ImageNode,
		video: VideoNode,
		docs: DocsNode,
		sheet: SheetNode,
	};

	function getChildPreview(child) {
		if (child.data?.title) return child.data.title;
		if (child.data?.text) {
			const firstLine = child.data.text.split('\n')[0];
			return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine;
		}
		if (child.data?.alt) return child.data.alt;
		if (child.data?.url) return child.data.url;
		return child.type;
	}

	function removeChild(e, child) {
		e.stopPropagation();
		child.parentId = null;
		child.x = node.x + (node.width || 250) + 30;
		child.y = node.y;
		nodesState.saveToStorage();
	}

	function openChildOverlay(e, child) {
		e.stopPropagation();
		editingChild = child;
	}

	function closeOverlay(e) {
		if (e) e.stopPropagation();
		editingChild = null;
	}

	function portal(element) {
		document.body.appendChild(element);
		return {
			destroy() {
				if (element.parentNode) {
					element.parentNode.removeChild(element);
				}
			}
		};
	}

	let OverlayComponent = $derived(editingChild ? overlayComponents[editingChild.type] : null);
</script>

<div class="flex flex-col w-full h-full outline-none lattice-stack" data-stack-id={node.id}>
	<!-- Title Bar -->
	<div class="h-8 w-full border-b border-[var(--color-border)]/30 flex items-center px-3 gap-2">
		{#if isEditing}
			<input 
				bind:this={element}
				class="flex-1 min-w-10 bg-transparent text-xs uppercase tracking-wider font-mono font-semibold text-[var(--color-text-primary)] focus:outline-none"
				value={node.data.title || ''}
				oninput={handleInput}
				onblur={() => (isEditing = false)}
				onkeydown={(e) => { if (e.key === 'Enter') isEditing = false; }}
				placeholder="Stack Name"
			/>
		{:else}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div 
				class="flex-1 text-xs uppercase tracking-wider font-mono font-semibold text-[var(--color-text-primary)] markdown-inline cursor-text truncate"
				onclick={startEditing}
			>
				{@html renderedTitle}
			</div>
		{/if}
		<span class="text-[9px] font-mono text-[var(--color-text-secondary)] opacity-60 shrink-0">
			{children.length}
		</span>
	</div>
	
	<!-- Child List -->
	<div class="flex-1 overflow-y-auto min-h-[40px] p-2 flex flex-col gap-1.5 bg-black/5">
		{#each children as child (child.id)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div 
				class="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 shadow-sm hover:shadow hover:border-[var(--color-border)] cursor-pointer group/row rounded transition-all"
				ondblclick={(e) => openChildOverlay(e, child)}
			>
				<span class="text-[10px] shrink-0 opacity-60 flex items-center justify-center w-3 h-3">{@html TYPE_ICONS[child.type] || '•'}</span>
				<span class="flex-1 text-[11px] font-mono text-[var(--color-text-primary)] truncate">
					{getChildPreview(child)}
				</span>
				<button
					class="w-4 h-4 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer shrink-0"
					onclick={(e) => removeChild(e, child)}
					title="Remove from stack"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>
		{/each}
		{#if children.length === 0}
			<div class="text-[10px] text-[var(--color-text-secondary)] font-mono text-center mt-4 uppercase tracking-widest opacity-50">Drop cards here</div>
		{/if}
	</div>
</div>

<!-- Editing Overlay -->
{#if editingChild}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		use:portal
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
		onpointerdown={closeOverlay}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col w-[95vw] h-[95vh] max-w-7xl"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<!-- Overlay Header -->
			<div class="h-7 w-full bg-[#111] border-b border-[var(--color-border)] flex items-center justify-between px-3 shrink-0">
				<span class="text-[9px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
					{@html TYPE_ICONS[editingChild.type] || ''} Editing {editingChild.type}
				</span>
				<button 
					class="w-4 h-4 text-[var(--color-text-secondary)] hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer"
					onclick={closeOverlay}
					title="Close overlay"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>
			<!-- Node Content -->
			<div class="flex-1 overflow-auto">
				{#if OverlayComponent}
					<OverlayComponent node={editingChild} />
				{:else}
					<div class="p-4 text-[var(--color-text-secondary)] text-xs font-mono">Cannot edit this node type inline.</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

