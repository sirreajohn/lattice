<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/ui/Navbar.svelte';
	import SettingsOverlay from '$lib/ui/SettingsOverlay.svelte';
	import KeyboardListener from '$lib/ui/KeyboardListener.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Lattice</title>
</svelte:head>

<Navbar />
<SettingsOverlay />
<KeyboardListener />
{@render children()}
