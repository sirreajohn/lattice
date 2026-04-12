<script>
	import { nodesState } from '$lib/state/nodes.svelte.js';

	let { node } = $props();

	let isEditing = $state(false);
	$effect.pre(() => {
		if (!node.data.url) isEditing = true;
	});
	let inputElement = $state();

	/** @param {any} e */
	function handleInput(e) {
		nodesState.updateNodeData(node.id, { url: e.target.value });
	}

	/** @param {string} url */
	function parseEmbedUrl(url) {
		if (!url) return '';
		
		try {
			// YouTube parsing
			if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
				const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
				const match = url.match(regex);
				if (match && match[1]) {
					return `https://www.youtube.com/embed/${match[1]}`;
				}
			}
			
			// Vimeo parsing
			if (url.includes('vimeo.com/')) {
				const regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
				const match = url.match(regex);
				if (match && match[1]) {
					return `https://player.vimeo.com/video/${match[1]}`;
				}
			}
			
			// Raw url fallback for generic native iframes
			return url;
		} catch (e) {
			return url;
		}
	}

	let embedUrl = $derived(parseEmbedUrl(node.data.url));

	/** @param {any} e */
	function startEditing(e) {
		e.stopPropagation();
		isEditing = true;
		setTimeout(() => { if (inputElement) inputElement.focus(); }, 0);
	}
</script>

<div class="w-full h-full flex flex-col items-center justify-center bg-[#050505]">
	{#if isEditing}
		<div class="w-full h-full p-6 flex flex-col items-center justify-center gap-2 relative z-10">
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)] mb-2"><path d="m10 8 6 4-6 4z"/><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
			<input 
				bind:this={inputElement}
				type="text"
				class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] pointer-events-auto"
				placeholder="Paste YouTube, Vimeo, or raw video url..."
				value={node.data.url || ''}
				oninput={handleInput}
				onblur={() => { if (node.data.url) isEditing = false; }}
				onkeydown={(e) => {
					e.stopPropagation(); 
					if (e.key === 'Enter' && node.data.url) isEditing = false; 
				}}
			/>
		</div>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="w-full h-full relative group cursor-pointer"
			oncontextmenu={startEditing}
		>
			<iframe 
				src={embedUrl}
				class="w-full h-full border-none pointer-events-auto"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
				allowfullscreen
				title="Video block"
			></iframe>

			<!-- Edit overlay button to allow modifying url after creation -->
			<button 
				class="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 z-30 pointer-events-auto shadow-lg"
				onclick={startEditing}
				title="Edit Video URL"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
			</button>
		</div>
	{/if}
</div>
