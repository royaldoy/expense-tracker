<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	onMount(() => {
		goto(`/wallets/${page.params.id}`, { replaceState: true });
	});
</script>
