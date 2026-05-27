<script lang="ts">
	import ActionButtons from './ActionButtons.svelte';
	import GameBoard from './GameBoard.svelte';
	import Sidebar from './Sidebar.svelte';
	import TileRack from './TileRack.svelte';
	import type { BoardCellData, PlayerData, TileData } from '$lib/types/game';

	const BOARD_ROWS = 12;
	const BOARD_COLS = 17;

	const players: PlayerData[] = [
		{
			id: 'player-1',
			name: '#deby',
			score: 0,
			isCurrent: true,
			status: 'Gondolkodik'
		},
		{
			id: 'player-2',
			name: '#próba',
			score: 0,
			isCurrent: false,
			status: 'Várakozik'
		}
	];

	const rackTiles: TileData[] = [
		{ id: 'rack-1', letter: 'E', points: 4, source: 'rack' },
		{ id: 'rack-2', letter: 'É', points: 0, source: 'rack' },
		{ id: 'rack-3', letter: 'S', points: 0, source: 'rack' },
		{ id: 'rack-4', letter: '*', points: 0, source: 'rack', isJoker: true },
		{ id: 'rack-5', letter: 'T', points: 1, source: 'rack' },
		{ id: 'rack-6', letter: 'Á', points: 3, source: 'rack' },
		{ id: 'rack-7', letter: 'T', points: 1, source: 'rack' },
		{ id: 'rack-8', letter: 'J', points: 3, source: 'rack' },
		{ id: 'rack-9', letter: 'Z', points: 1, source: 'rack' },
		{ id: 'rack-10', letter: 'E', points: 5, source: 'rack' }
	];

	const board = createInitialBoard();

	const message =
		'Íme az első 10 betű. Rakj ki egy érvényes szót, ellenőrizd a szótárral, majd nyomd meg az OK gombot.';

	const round = 1;
	const totalRounds = 7;
	const timer = 120;

	function createInitialBoard(): BoardCellData[][] {
		const emptyBoard: BoardCellData[][] = Array.from({ length: BOARD_ROWS }, (_, row) =>
			Array.from({ length: BOARD_COLS }, (_, col) => ({
				row,
				col,
				tile: null
			}))
		);

		placeWordVertical(emptyBoard, 'JÁTÉK', 2, 6);
		placeWordHorizontal(emptyBoard, 'A', 8, 4);
		placeWordHorizontal(emptyBoard, 'BETŰKKEL', 9, 8);

		return emptyBoard;
	}

	function placeWordHorizontal(boardData: BoardCellData[][], word: string, row: number, startCol: number) {
		const letters = Array.from(word);

		letters.forEach((letter, index) => {
			const col = startCol + index;

			boardData[row][col] = {
				...boardData[row][col],
				isTitleCell: true,
				tile: {
					id: `title-${row}-${col}`,
					letter,
					points: 10,
					source: 'title'
				}
			};
		});
	}

	function placeWordVertical(boardData: BoardCellData[][], word: string, startRow: number, col: number) {
		const letters = Array.from(word);

		letters.forEach((letter, index) => {
			const row = startRow + index;

			boardData[row][col] = {
				...boardData[row][col],
				isTitleCell: true,
				tile: {
					id: `title-${row}-${col}`,
					letter,
					points: 10,
					source: 'title'
				}
			};
		});
	}

	function handleDictionaryCheck() {
		alert('A szótárellenőrzés jelenleg mock funkció. Backend bekötés később jön.');
	}

	function handleSubmitMove() {
		alert('Az OK gomb jelenleg mock funkció. A lerakás validálása későbbi feladat.');
	}
</script>

<main class="game-page">
	<section class="game-shell" aria-label="Játékfelület">
		<Sidebar
			{message}
			{round}
			{totalRounds}
			{timer}
			{players}
			onDictionaryCheck={handleDictionaryCheck}
			onSubmitMove={handleSubmitMove}
		/>

		<section class="game-main" aria-label="Játéktábla és betűkészlet">
			<GameBoard {board} />

			<TileRack tiles={rackTiles} />

			<div class="game-bottom-actions">
				<ActionButtons
					onDictionaryCheck={handleDictionaryCheck}
					onSubmitMove={handleSubmitMove}
				/>
			</div>
		</section>
	</section>
</main>