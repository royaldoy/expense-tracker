<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/settings', { replaceState: true });
	});
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<p class="text-xs text-on-surface-variant">Mengalihkan ke Pengaturan...</p>
</div>
