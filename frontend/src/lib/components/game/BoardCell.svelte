<script lang="ts">
	import Tile from './Tile.svelte';
	import type { BoardCellData } from '$lib/types/game';

	type Props = {
		cell: BoardCellData;
		activeDraggedTileId?: string | null;
		onCellPointerDown: (cell: BoardCellData, event: PointerEvent) => void;
	};

	let { cell, activeDraggedTileId = null, onCellPointerDown }: Props = $props();

	function getCellLabel(cellData: BoardCellData): string {
		const position = `${cellData.row + 1}. sor, ${cellData.col + 1}. oszlop`;

		if (!cellData.tile) {
			return `${position}, üres mező`;
		}

		if (cellData.locked) {
			return `${position}, ${cellData.tile.letter} betű, zárolt mező`;
		}

		return `${position}, ${cellData.tile.letter} betű`;
	}

	function getCellClass(cellData: BoardCellData): string {
		return [
			'board-cell',
			cellData.tile ? 'board-cell--filled' : '',
			cellData.isTitleCell ? 'board-cell--title' : '',
			cellData.isNewPlacement ? 'board-cell--new' : '',
			cellData.locked ? 'board-cell--locked' : '',
			cellData.tile?.id === activeDraggedTileId ? 'board-cell--drag-source' : ''
		]
			.filter(Boolean)
			.join(' ');
	}
</script>

<button
	type="button"
	class={getCellClass(cell)}
	data-board-cell="true"
	data-row={cell.row}
	data-col={cell.col}
	aria-label={getCellLabel(cell)}
	onpointerdown={(event) => onCellPointerDown(cell, event)}
>
	{#if cell.tile}
		<Tile tile={cell.tile} variant="board" />
	{/if}
</button>
