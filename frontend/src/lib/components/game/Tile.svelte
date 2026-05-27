<script lang="ts">
	import type { TileData } from '$lib/types/game';

	type TileVariant = 'board' | 'rack';

	type Props = {
		tile: TileData;
		variant?: TileVariant;
	};

	let { tile, variant = 'rack' }: Props = $props();
</script>

<div
	class={`letter-tile letter-tile--${variant} letter-tile--${tile.source} ${
		tile.isJoker ? 'letter-tile--joker' : ''
	}`}
	aria-label={`${tile.letter} betű, ${tile.points} pont`}
>
	<span class="letter-tile__letter">{tile.letter}</span>
	<span class="letter-tile__points">{tile.points}</span>
</div>