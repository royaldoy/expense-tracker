<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	onMount(() => {
		const search = page.url.search;
		goto(`/transactions/new${search}`, { replaceState: true });
	});
</script>
