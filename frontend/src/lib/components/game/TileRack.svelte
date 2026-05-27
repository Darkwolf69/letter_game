<script lang="ts">
	import Tile from './Tile.svelte';
	import type { TileData } from '$lib/types/game';

	type Props = {
		tiles: TileData[];
	};

	let { tiles }: Props = $props();
</script>

<section class="tile-rack-section" aria-label="Forduló betűi">
	<div class="tile-rack-header">
		<p class="eyebrow">Betűkészlet</p>
		<strong>{tiles.length} betű</strong>
	</div>

	<div class="tile-rack">
		{#each tiles as tile (tile.id)}
			<Tile {tile} variant="rack" />
		{/each}
	</div>
</section>