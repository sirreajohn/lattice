<script>
	let { form } = $props();
</script>

<div
	class="fixed inset-0 min-h-screen flex items-center justify-center bg-canvas bg-dot-pattern z-[100]"
>
	<div
		class="w-full max-w-sm bg-surface/95 backdrop-blur-md border border-border border-t-accent rounded-none shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
	>
		<!-- Industrial Header Decor -->
		<div class="h-1 w-full bg-accent/20"></div>

		<div class="p-8">
			<div class="flex items-center gap-3 mb-8">
				<div
					class="w-10 h-10 bg-accent text-canvas flex items-center justify-center font-bold font-mono text-xl shadow-[0_0_15px_rgba(0,0,0,0.3)]"
				>
					L
				</div>
				<div class="flex flex-col">
					<span
						class="text-[9px] tracking-[0.3em] font-bold text-accent"
						>SYS_AUTH_v2</span
					>
					<span
						class="text-xs font-mono text-text-secondary tracking-widest uppercase"
						>Lattice</span
					>
				</div>
			</div>

			<div class="mb-8">
				<h1
					class="text-lg font-mono font-bold text-text-primary uppercase tracking-tight"
				>
					Login Session
				</h1>
				<div class="h-px w-12 bg-accent mt-1"></div>
			</div>

			{#if form?.error}
				<div
					class="mb-6 p-3 bg-red-500/10 border-l-2 border-red-500 text-red-500 text-[10px] font-mono tracking-tight animate-in fade-in slide-in-from-left-2"
				>
					<span class="font-bold mr-1">ERR_AUTH:</span>
					{form.error}
				</div>
			{/if}

			<form method="POST" class="flex flex-col gap-5">
				<div class="flex flex-col gap-1.5">
					<label
						for="username"
						class="text-[10px] font-mono text-text-secondary uppercase tracking-[0.2em] font-bold"
						>Username_</label
					>
					<input
						id="username"
						name="username"
						type="text"
						required
						placeholder="ENT_UID"
						class="bg-canvas/50 border border-border text-text-primary rounded-none px-3 py-2.5 font-mono text-xs focus:outline-none focus:border-accent transition-all w-full placeholder:opacity-20 translate-z-0"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="password"
						class="text-[10px] font-mono text-text-secondary uppercase tracking-[0.2em] font-bold"
						>Password_</label
					>
					<input
						id="password"
						name="password"
						type="password"
						required
						placeholder="******"
						class="bg-canvas/50 border border-border text-text-primary rounded-none px-3 py-2.5 font-mono text-xs focus:outline-none focus:border-accent transition-all w-full placeholder:opacity-20 translate-z-0"
					/>
				</div>

				<button
					type="submit"
					class="mt-4 bg-accent text-canvas font-bold font-mono text-[10px] uppercase tracking-[0.3em] py-3.5 rounded-none hover:bg-accent/90 shadow-[0_0_20px_rgba(0,0,0,0.1)] transition-all w-full cursor-pointer flex items-center justify-center gap-2 group"
				>
					Login_
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="group-hover:translate-x-1 transition-transform"
						><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
					>
				</button>
			</form>

			<div
				class="mt-8 pt-6 border-t border-border/30 flex justify-center"
			>
				<p
					class="text-[10px] font-mono text-text-secondary tracking-wider"
				>
					New User? <a
						href="/auth/signup"
						class="text-accent font-bold hover:underline ml-1"
						>REGISTER_NEW</a
					>
				</p>
			</div>
		</div>
	</div>
</div>
