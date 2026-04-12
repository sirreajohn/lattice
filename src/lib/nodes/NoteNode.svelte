<script>
	import { nodesState } from '$lib/state/nodes.svelte.js';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { node } = $props();
	let isEditing = $state(false);
	let element = $state();

	function handleInput(e) {
		nodesState.updateNodeData(node.id, { text: e.target.value });
	}

	function startEditing(e) {
		e.stopPropagation();
		isEditing = true;
		setTimeout(() => {
			if (element) {
				element.focus();
				element.selectionStart = element.value.length;
			}
		}, 0);
	}

	let renderedMarkdown = $derived(
		node.data.text 
			? DOMPurify.sanitize(marked.parse(node.data.text)) 
			: '<span class="text-[var(--color-text-secondary)] italic font-mono opacity-50"># Empty Note</span>'
	);
</script>

<div class="w-full h-full flex flex-col min-h-16">
	{#if isEditing}
		<!-- We need a transparent bg and padding, full width text-area -->
		<textarea 
			bind:this={element}
			class="w-full p-4 flex-1 bg-transparent text-sm resize-none focus:outline-none focus:ring-0 text-[var(--color-text-primary)] font-mono cursor-text"
			value={node.data.text || ''}
			oninput={handleInput}
			onblur={() => (isEditing = false)}
			placeholder="# Heading..."
		></textarea>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="w-full flex-1 p-4 text-sm markdown-body cursor-text select-text overflow-y-auto text-wrap break-words text-text-primary relative group"
			onclick={startEditing}
		>
			<div class="opacity-0 group-hover:opacity-10 absolute top-2 right-4 text-[10px] uppercase font-mono tracking-widest pointer-events-none transition-opacity">Edit</div>
			{@html renderedMarkdown}
		</div>
	{/if}
</div>
