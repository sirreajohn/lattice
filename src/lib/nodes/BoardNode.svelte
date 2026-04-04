<script>
	import { nodesState, globalMetadata } from '$lib/state/nodes.svelte.js';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';
	import { goto } from '$app/navigation';

	let { node } = $props();
	let isEditing = $state(false);
	let isEditingIcon = $state(false);
	let element = $state();
	let iconElement = $state();
	
	let displayTitle = $derived(globalMetadata.boardNames[node.id] || node.data.title || '');

	function handleInput(e) {
		nodesState.updateNodeData(node.id, { title: e.target.value });
		globalMetadata.setName(node.id, e.target.value);
	}

	function handleDblClick(e) {
		if (isEditing || isEditingIcon) return;
		e.stopPropagation();
		
		if (nodesState.depth >= nodesState.maxDepth) {
			alert('Maximum recurring board limit reached!');
			return;
		}

		goto(`/b/${node.id}?parent=${nodesState.boardId}&depth=${nodesState.depth + 1}`);
	}

	function startEditing(e) {
		e.stopPropagation(); 
		isEditing = true;
		setTimeout(() => { if (element) element.focus(); }, 0);
	}

	function startEditingIcon(e) {
		e.stopPropagation();
		isEditingIcon = true;
		setTimeout(() => { if (iconElement) iconElement.focus(); }, 0);
	}

	let renderedTitle = $derived(
		displayTitle 
			? DOMPurify.sanitize(marked.parseInline(displayTitle)) 
			: '<span class="opacity-50 font-mono text-xs">Untitled Board</span>'
	);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="w-full h-full flex flex-col items-center justify-center p-6 transition-colors cursor-pointer group"
	ondblclick={handleDblClick}
>
	{#if isEditingIcon}
		<!-- stopPropagation on keydown/pointerdown prevents drag -->
		<input 
			bind:this={iconElement}
			class="w-12 bg-transparent text-center text-[38px] focus:outline-none mb-2 pointer-events-auto"
			style="filter: grayscale(1) contrast(1.2)"
			value={node.data.icon || ''}
			oninput={(e) => nodesState.updateNodeData(node.id, { icon: e.target.value })}
			onblur={() => (isEditingIcon = false)}
			onkeydown={(e) => { if (e.key === 'Enter') isEditingIcon = false; }}
			maxlength="2"
            placeholder="🌍"
		/>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div 
			class="mb-3 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] transition-colors cursor-pointer pointer-events-auto flex items-center justify-center"
			onclick={startEditingIcon}
			style={node.data.icon ? "filter: grayscale(1) contrast(1.2); font-size: 38px; line-height: 1;" : ""}
		>
			{#if node.data.icon}
				{node.data.icon}
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
			{/if}
		</div>
	{/if}

	{#if isEditing}
		<input 
			bind:this={element}
			class="w-full bg-transparent text-center font-mono font-bold text-sm text-[var(--color-text-primary)] focus:outline-none placeholder-opacity-50"
			value={displayTitle}
			oninput={handleInput}
			onblur={() => (isEditing = false)}
			onkeydown={(e) => { if (e.key === 'Enter') isEditing = false; }}
			placeholder="Board title"
		/>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div 
			class="w-full text-center font-mono font-bold text-sm text-[var(--color-text-primary)] cursor-text markdown-inline"
			onclick={startEditing}
		>
			{@html renderedTitle}
		</div>
	{/if}

	<div class="mt-2 text-[10px] font-mono text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-50 uppercase tracking-widest pointer-events-none transition-opacity">
		Double Click to Enter
	</div>
</div>
