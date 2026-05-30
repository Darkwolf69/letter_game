<script lang="ts">
	import Tile from './Tile.svelte';
	import type { TileData } from '$lib/types/game';

	type Props = {
		tiles: TileData[];
		activeDraggedTileId?: string | null;
		onRackTilePointerDown: (tile: TileData, event: PointerEvent) => void;
	};

	let { tiles, activeDraggedTileId = null, onRackTilePointerDown }: Props = $props();

	function getTileButtonClass(tile: TileData): string {
		return ['tile-rack-button', tile.id === activeDraggedTileId ? 'tile-rack-button--dragging' : '']
			.filter(Boolean)
			.join(' ');
	}
</script>

<section class="tile-rack-section" aria-label="Forduló betűi" data-tile-rack="true">
	<div class="tile-rack-header">
		<p class="eyebrow">Betűkészlet</p>
		<strong>{tiles.length} betű</strong>
	</div>

	<div class="tile-rack">
		{#if tiles.length === 0}
			<p class="tile-rack-empty">Nincs elérhető betű a rackben.</p>
		{:else}
			{#each tiles as tile (tile.id)}
				<button
					type="button"
					class={getTileButtonClass(tile)}
					onpointerdown={(event) => onRackTilePointerDown(tile, event)}
				>
					<Tile {tile} variant="rack" />
				</button>
			{/each}
		{/if}
	</div>
</section>
