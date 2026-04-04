<script>
	let { form } = $props();
</script>

<div class="fixed inset-0 min-h-screen flex items-center justify-center bg-[var(--color-canvas)] bg-dot-pattern z-[100]">
	<div class="w-full max-w-md p-8 rounded-xl bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)] shadow-2xl">
		<div class="flex justify-center mb-6">
			<div class="w-10 h-10 bg-[var(--color-text-primary)] rounded-md flex items-center justify-center">
				<span class="text-[var(--color-canvas)] font-bold font-mono text-xl">L</span>
			</div>
		</div>
		<h1 class="text-2xl font-mono text-center font-bold text-[var(--color-text-primary)] mb-2">Create Account</h1>
		<p class="text-center text-xs font-mono text-[var(--color-text-secondary)] mb-8 uppercase tracking-widest">Join your local Lattice</p>
		
		{#if form?.error}
			<div class="mb-4 p-3 rounded bg-red-500/20 border border-red-500/50 text-red-500 text-sm font-mono text-center">
				{form.error}
			</div>
		{/if}

		<form method="POST" class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">Username</label>
				<input name="username" type="text" required class="bg-black/20 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors w-full" />
			</div>
			
			<div class="flex flex-col gap-1">
				<label class="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">Password</label>
				<input name="password" type="password" required class="bg-black/20 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors w-full" />
			</div>

			<button type="submit" class="mt-4 bg-[var(--color-text-primary)] text-[var(--color-canvas)] font-bold font-mono text-sm uppercase tracking-widest py-3 rounded hover:opacity-90 transition-opacity w-full cursor-pointer">
				Sign Up
			</button>
		</form>

		<p class="mt-6 text-center text-xs font-mono text-[var(--color-text-secondary)]">
			Already have an account? <a href="/auth/login" class="text-[var(--color-accent)] hover:underline">Log In</a>
		</p>
	</div>
</div>
