<script lang="ts">
	import Tile from './Tile.svelte';
	import type { BoardCellData } from '$lib/types/game';

	type Props = {
		cell: BoardCellData;
	};

	let { cell }: Props = $props();

	function getCellLabel(cellData: BoardCellData): string {
		const position = `${cellData.row + 1}. sor, ${cellData.col + 1}. oszlop`;

		if (!cellData.tile) {
			return `${position}, üres mező`;
		}

		return `${position}, ${cellData.tile.letter} betű`;
	}
</script>

<div
	class={`board-cell ${cell.tile ? 'board-cell--filled' : ''} ${
		cell.isTitleCell ? 'board-cell--title' : ''
	} ${cell.isNewPlacement ? 'board-cell--new' : ''}`}
	aria-label={getCellLabel(cell)}
>
	{#if cell.tile}
		<Tile tile={cell.tile} variant="board" />
	{/if}
</div>