<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/recurring', { replaceState: true });
	});
</script>

<div class="py-20 text-center text-xs text-on-surface-variant">
	Mengarahkan ke Transaksi Berulang...
</div>
