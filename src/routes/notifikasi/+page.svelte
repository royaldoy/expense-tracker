<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/notifications', { replaceState: true });
	});
</script>

<div class="py-20 text-center text-xs text-on-surface-variant">
	Mengarahkan ke Pusat Notifikasi...
</div>
