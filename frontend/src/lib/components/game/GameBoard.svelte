<script lang="ts">
	import BoardCell from './BoardCell.svelte';
	import type { BoardCellData } from '$lib/types/game';

	type Props = {
		board: BoardCellData[][];
	};

	let { board }: Props = $props();

	function getColumnCount(boardData: BoardCellData[][]): number {
		return boardData[0]?.length ?? 17;
	}

	function getRowCount(boardData: BoardCellData[][]): number {
		return boardData.length || 12;
	}
</script>

<section class="game-board-section" aria-label="Saját játéktábla">
	<div class="game-board-header">
		<div>
			<p class="eyebrow">Saját tábla</p>
			<h1>Forduló kezdete</h1>
		</div>

		<p class="game-board-help">
			A piros betűk már a táblán vannak. Ezek később keresztezésre használhatók.
		</p>
	</div>

	<div class="game-board-frame">
		<div
			class="game-board"
			style={`--board-cols: ${getColumnCount(board)}; --board-rows: ${getRowCount(board)};`}
			aria-label="17 oszlopból és 12 sorból álló játéktábla"
		>
			{#each board as row}
				{#each row as cell}
					<BoardCell {cell} />
				{/each}
			{/each}
		</div>
	</div>
</section>