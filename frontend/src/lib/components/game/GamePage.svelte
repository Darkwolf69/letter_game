<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getUserStatus } from '$lib/auth';
	import ActionButtons from './ActionButtons.svelte';
	import GameBoard from './GameBoard.svelte';
	import Sidebar from './Sidebar.svelte';
	import TileRack from './TileRack.svelte';
	import { createGame, getGameState, startGame } from '$lib/services/games';
	import type {
		BackendBoardCell,
		BoardCellData,
		GameStateResponse,
		GameStatus,
		PlayerData,
		PlayerStatus,
		TileData,
		TileSource
	} from '$lib/types/game';
	import type { User } from '$lib/types/types';
	import Tile from './Tile.svelte';
	import JokerLetterDialog from './JokerLetterDialog.svelte';

	type TileSelectionOrigin = 'rack' | 'board';

	type TileSelection = {
		tile: TileData;
		origin: TileSelectionOrigin;
		row?: number;
		col?: number;
	};

	type PlacedTileData = {
		tileId: string;
		row: number;
		col: number;
		letter: string;
		points: number;
		isJoker: boolean;
	};

	type PendingJokerPlacement = {
		selection: TileSelection;
		row: number;
		col: number;
	};

	type RectLike = {
		left: number;
		top: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};

	type ActiveDrag = {
		selection: TileSelection;
		pointerId: number;
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
		width: number;
		height: number;
	};

	type BoardDropTarget = {
		row: number;
		col: number;
		overlapArea: number;
	};

	const JOKER_LETTERS = [
		'A',
		'Á',
		'B',
		'C',
		'CS',
		'D',
		'DZS',
		'E',
		'É',
		'F',
		'G',
		'GY',
		'H',
		'I',
		'Í',
		'J',
		'K',
		'L',
		'LY',
		'M',
		'N',
		'NY',
		'O',
		'Ó',
		'Ö',
		'Ő',
		'P',
		'R',
		'S',
		'SZ',
		'T',
		'TY',
		'U',
		'Ú',
		'Ü',
		'Ű',
		'V',
		'Z',
		'ZS'
	];

	let placedThisRound: PlacedTileData[] = $state([]);
	let lockedBoardTiles: string[] = $state([]);
	let selectedTile: TileSelection | null = $state(null);
	let draggedTile: TileData | null = $state(null);
	let activeDrag: ActiveDrag | null = $state(null);
	let pendingJokerPlacement: PendingJokerPlacement | null = $state(null);

	const BOARD_ROWS = 12;
	const BOARD_COLS = 17;
	const ROUND_SECONDS = 120;

	let currentUser: User | null = $state(null);
	let currentUserId: number | null = $state(null);
	let gameState: GameStateResponse | null = $state(null);
	let board: BoardCellData[][] = $state(createEmptyBoard());
	let players: PlayerData[] = $state([]);
	let rackTiles: TileData[] = $state([]);
	let message: string = $state('Adj meg egy ellenfél azonosítót, majd hozz létre egy új játékot.');
	let round: number = $state(0);
	let totalRounds: number = $state(7);
	let timer: number = $state(ROUND_SECONDS);
	let boardTitle: string = $state('Játék előkészítése');
	let boardOwnerName: string = $state('Saját tábla');
	let boardHelpText: string = $state(
		'A játék létrehozása után a backend adja vissza a saját táblát és a közös betűkészletet.'
	);
	let secondUserIdInput: string = $state('');
	let gameIdInput: string = $state('');
	let activeGameId: number | null = $state(null);
	let isLoading: boolean = $state(true);
	let isCreating: boolean = $state(false);
	let isStarting: boolean = $state(false);
	let isRefreshing: boolean = $state(false);
	let errorMessage: string = $state('');
	let successMessage: string = $state('');

	onMount(() => {
		void initializePage();

		const timerInterval = setInterval(() => {
			updateTimerFromState();
		}, 1000);

		return () => {
			clearInterval(timerInterval);
			removeDragListeners();
		};
	});

	async function initializePage(): Promise<void> {
		try {
			currentUser = await getUserStatus();

			if (!currentUser) {
				await goto('/login');
				return;
			}

			currentUserId = currentUser.userId;

			const gameIdFromUrl = getGameIdFromUrl();
			if (gameIdFromUrl) {
				await loadGameState(gameIdFromUrl, false);
			}
		} catch (error) {
			errorMessage = getErrorMessage(error);
		} finally {
			isLoading = false;
		}
	}

	function getGameIdFromUrl(): number | null {
		const params = new URLSearchParams(window.location.search);
		return toPositiveInteger(params.get('gameId'));
	}

	function toPositiveInteger(value: unknown): number | null {
		const parsed = Number(value);

		if (!Number.isInteger(parsed) || parsed <= 0) {
			return null;
		}

		return parsed;
	}

	function createEmptyBoard(): BoardCellData[][] {
		return Array.from({ length: BOARD_ROWS }, (_, row) =>
			Array.from({ length: BOARD_COLS }, (_, col) => ({
				row,
				col,
				tile: null
			}))
		);
	}

	function mapBackendSourceToTileSource(source: BackendBoardCell['source']): TileSource {
		if (source === 'TITLE') {
			return 'title';
		}

		return 'player';
	}

	function createBoardFromState(state: GameStateResponse): BoardCellData[][] {
		const nextBoard = createEmptyBoard();
		const owner = getVisibleBoardOwner(state);

		if (!owner) {
			return nextBoard;
		}

		const ownerBoard = state.boards[owner.userId];
		if (!ownerBoard) {
			return nextBoard;
		}

		for (const cell of ownerBoard.cells) {
			if (cell.y < 0 || cell.y >= BOARD_ROWS || cell.x < 0 || cell.x >= BOARD_COLS) {
				continue;
			}

			const tileSource = mapBackendSourceToTileSource(cell.source);

			nextBoard[cell.y][cell.x] = {
				row: cell.y,
				col: cell.x,
				isTitleCell: cell.source === 'TITLE',
				isNewPlacement: cell.source !== 'TITLE' && cell.createdRound === state.game.round,
				locked: cell.locked,
				tile: {
					id: `board-${owner.userId}-${cell.x}-${cell.y}`,
					letter: cell.letter,
					points: cell.points,
					source: tileSource,
					isJoker: cell.isJoker
				}
			};
		}

		return nextBoard;
	}

	function createPlayersFromState(state: GameStateResponse): PlayerData[] {
		return state.players.map((player) => ({
			id: String(player.userId),
			userId: player.userId,
			name: player.username,
			score: player.score,
			isCurrent: player.userId === currentUserId,
			status: getPlayerStatus(state.game.status)
		}));
	}

	function createRackFromState(state: GameStateResponse): TileData[] {
		return (
			state.round?.tiles.map((tile) => ({
				id: tile.id,
				letter: tile.letter,
				points: tile.points,
				source: 'rack' as const,
				isJoker: tile.isJoker
			})) ?? []
		);
	}

	function getPlayerStatus(status: GameStatus): PlayerStatus {
		if (status === 'CREATED') {
			return 'Várakozik';
		}

		if (status === 'ROUND_ACTIVE') {
			return 'Gondolkodik';
		}

		return 'Kész';
	}

	function getVisibleBoardOwner(
		state: GameStateResponse
	): GameStateResponse['players'][number] | null {
		if (currentUserId && state.boards[currentUserId]) {
			return state.players.find((player) => player.userId === currentUserId) ?? null;
		}

		return state.players[0] ?? null;
	}

	function applyGameState(state: GameStateResponse): void {
		gameState = state;
		activeGameId = state.game.id;
		gameIdInput = String(state.game.id);
		round = state.game.round;
		totalRounds = state.game.maxRounds;
		players = createPlayersFromState(state);
		rackTiles = createRackFromState(state);
		board = createBoardFromState(state);

		const owner = getVisibleBoardOwner(state);
		boardOwnerName = owner ? `${owner.username} táblája` : 'Saját tábla';
		boardTitle = getBoardTitle(state);
		boardHelpText = getBoardHelpText(state);
		message = getMessageFromState(state);

		lockedBoardTiles = createLockedBoardTilesFromState(state);
		placedThisRound = [];
		selectedTile = null;
		draggedTile = null;
		activeDrag = null;
		pendingJokerPlacement = null;

		updateTimerFromState();
	}

	function getBoardTitle(state: GameStateResponse): string {
		if (state.game.status === 'CREATED') {
			return 'Játék előkészítve';
		}

		if (state.game.status === 'FINISHED') {
			return 'Játék vége';
		}

		return `${state.game.round}. forduló`;
	}

	function getBoardHelpText(state: GameStateResponse): string {
		if (state.game.status === 'CREATED') {
			return 'A saját tábla már létrejött. Indítás után megjelenik a forduló 10 közös betűje.';
		}

		return 'A piros betűk már a táblán vannak. A betűrackben a backend által sorsolt közös fordulóbetűk látszanak.';
	}

	function getMessageFromState(state: GameStateResponse): string {
		if (state.game.status === 'CREATED') {
			return 'A játék létrejött. Mindkét játékos saját táblát kapott. Indítsd el az első fordulót.';
		}

		if (state.game.status === 'ROUND_ACTIVE' && state.round) {
			return `Az ${state.round.roundNumber}. forduló aktív. Mindkét játékos ugyanazt a 10 betűcsempét kapta.`;
		}

		if (state.game.status === 'FINISHED') {
			return 'A játék véget ért. Az eredmény később a statisztikában is megjelenik.';
		}

		return 'Játékállapot betöltve.';
	}

	function updateTimerFromState(): void {
		if (!gameState?.round || gameState.game.status !== 'ROUND_ACTIVE') {
			timer = ROUND_SECONDS;
			return;
		}

		const startedAt = new Date(gameState.round.startedAt).getTime();
		if (Number.isNaN(startedAt)) {
			timer = ROUND_SECONDS;
			return;
		}

		const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
		timer = Math.max(0, ROUND_SECONDS - elapsedSeconds);
	}

	async function handleCreateGame(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		clearFeedback();

		const secondUserId = toPositiveInteger(secondUserIdInput);
		if (!secondUserId) {
			errorMessage = 'Adj meg egy érvényes ellenfél azonosítót.';
			return;
		}

		isCreating = true;

		try {
			const state = await createGame(secondUserId);
			applyGameState(state);
			successMessage = `Játék létrehozva. Azonosító: ${state.game.id}.`;
			await goto(`/game?gameId=${state.game.id}`, { replaceState: true });
		} catch (error) {
			errorMessage = getErrorMessage(error);
		} finally {
			isCreating = false;
		}
	}

	async function handleLoadGame(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		clearFeedback();

		const gameId = toPositiveInteger(gameIdInput);
		if (!gameId) {
			errorMessage = 'Adj meg egy érvényes játékazonosítót.';
			return;
		}

		await loadGameState(gameId, true);
	}

	async function loadGameState(gameId: number, updateUrl: boolean): Promise<void> {
		isRefreshing = true;

		try {
			const state = await getGameState(gameId);
			applyGameState(state);
			successMessage = `Játékállapot betöltve. Azonosító: ${state.game.id}.`;

			if (updateUrl) {
				await goto(`/game?gameId=${state.game.id}`, { replaceState: true });
			}
		} catch (error) {
			errorMessage = getErrorMessage(error);
		} finally {
			isRefreshing = false;
		}
	}

	async function handleStartGame(): Promise<void> {
		clearFeedback();

		if (!activeGameId) {
			errorMessage = 'Előbb hozz létre vagy tölts be egy játékot.';
			return;
		}

		isStarting = true;

		try {
			const state = await startGame(activeGameId);
			applyGameState(state);
			successMessage = `Az ${state.game.round}. forduló elindult.`;
		} catch (error) {
			errorMessage = getErrorMessage(error);
		} finally {
			isStarting = false;
		}
	}

	async function handleRefreshState(): Promise<void> {
		clearFeedback();

		if (!activeGameId) {
			errorMessage = 'Nincs aktív játékállapot, amit frissíteni lehetne.';
			return;
		}

		await loadGameState(activeGameId, false);
	}

	function clearFeedback(): void {
		errorMessage = '';
		successMessage = '';
	}

	function handleDictionaryCheck(): void {
		alert('A szótárellenőrzés következő backend feladat lesz: POST /api/dictionary/check.');
	}

	function handleSubmitMove(): void {
		alert(
			'Az OK gomb következő játéklogikai feladat lesz: lerakás beküldése és backend validáció.'
		);
	}

	function getErrorMessage(error: unknown): string {
		type ApiError = {
			response?: {
				data?: {
					message?: string;
					msg?: string;
				};
			};
			message?: string;
		};

		const apiError = error as ApiError;
		return (
			apiError.response?.data?.message ??
			apiError.response?.data?.msg ??
			apiError.message ??
			'Ismeretlen frontend vagy backend hiba történt.'
		);
	}

	function cellKey(row: number, col: number): string {
		return `${row}:${col}`;
	}

	function cloneBoard(boardData: BoardCellData[][]): BoardCellData[][] {
		return boardData.map((row) =>
			row.map((cell) => ({
				...cell,
				tile: cell.tile ? { ...cell.tile } : null
			}))
		);
	}

	function canMoveTiles(): boolean {
		return Boolean(gameState?.round && gameState.game.status === 'ROUND_ACTIVE');
	}

	function requireActiveRound(): boolean {
		if (canMoveTiles()) {
			return true;
		}

		errorMessage = 'Betűt csak aktív fordulóban lehet mozgatni.';
		return false;
	}

	function createLockedBoardTilesFromState(state: GameStateResponse): string[] {
		const owner = getVisibleBoardOwner(state);

		if (!owner) {
			return [];
		}

		const ownerBoard = state.boards[owner.userId];

		if (!ownerBoard) {
			return [];
		}

		return ownerBoard.cells.filter((cell) => cell.locked).map((cell) => cellKey(cell.y, cell.x));
	}

	function getDragRect(drag: ActiveDrag): RectLike {
		const left = drag.x - drag.offsetX;
		const top = drag.y - drag.offsetY;

		return {
			left,
			top,
			right: left + drag.width,
			bottom: top + drag.height,
			width: drag.width,
			height: drag.height
		};
	}

	function getOverlapArea(first: RectLike, second: DOMRect): number {
		const overlapWidth = Math.max(
			0,
			Math.min(first.right, second.right) - Math.max(first.left, second.left)
		);
		const overlapHeight = Math.max(
			0,
			Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
		);

		return overlapWidth * overlapHeight;
	}

	function findBoardCellWithLargestOverlap(dragRect: RectLike): BoardDropTarget | null {
		const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-board-cell="true"]'));

		let bestTarget: BoardDropTarget | null = null;

		for (const cellElement of cells) {
			const row = Number(cellElement.dataset.row);
			const col = Number(cellElement.dataset.col);

			if (!Number.isInteger(row) || !Number.isInteger(col)) {
				continue;
			}

			const overlapArea = getOverlapArea(dragRect, cellElement.getBoundingClientRect());

			if (overlapArea <= 0) {
				continue;
			}

			if (!bestTarget || overlapArea > bestTarget.overlapArea) {
				bestTarget = {
					row,
					col,
					overlapArea
				};
			}
		}

		return bestTarget;
	}

	function isRectOverRack(dragRect: RectLike): boolean {
		const rackElement = document.querySelector<HTMLElement>('[data-tile-rack="true"]');

		if (!rackElement) {
			return false;
		}

		return getOverlapArea(dragRect, rackElement.getBoundingClientRect()) > 0;
	}

	function getDragPreviewStyle(drag: ActiveDrag): string {
		const rect = getDragRect(drag);

		return `
		left: ${rect.left}px;
		top: ${rect.top}px;
		width: ${rect.width}px;
		height: ${rect.height}px;
	`;
	}

	function handleRackTilePointerDown(tile: TileData, event: PointerEvent): void {
		clearFeedback();

		if (!requireActiveRound()) {
			return;
		}

		startTileDrag(
			{
				tile,
				origin: 'rack'
			},
			event
		);
	}

	function handleBoardCellPointerDown(cell: BoardCellData, event: PointerEvent): void {
		clearFeedback();

		if (!requireActiveRound()) {
			return;
		}

		if (!cell.tile) {
			return;
		}

		if (
			cell.locked ||
			lockedBoardTiles.includes(cellKey(cell.row, cell.col)) ||
			!cell.isNewPlacement
		) {
			errorMessage = 'Ez a betű már zárolt, ezért nem mozgatható.';
			return;
		}

		startTileDrag(
			{
				tile: cell.tile,
				origin: 'board',
				row: cell.row,
				col: cell.col
			},
			event
		);
	}

	function startTileDrag(selection: TileSelection, event: PointerEvent): void {
		const sourceElement = event.currentTarget as HTMLElement;
		const rect = sourceElement.getBoundingClientRect();

		event.preventDefault();

		selectedTile = selection;
		draggedTile = selection.tile;

		activeDrag = {
			selection,
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			offsetX: event.clientX - rect.left,
			offsetY: event.clientY - rect.top,
			width: rect.width,
			height: rect.height
		};

		message = `${selection.tile.letter} megfogva. Húzd a táblára, majd engedd el.`;

		window.addEventListener('pointermove', handleWindowPointerMove);
		window.addEventListener('pointerup', handleWindowPointerUp);
		window.addEventListener('pointercancel', cancelActiveDrag);
	}

	function handleWindowPointerMove(event: PointerEvent): void {
		if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
			return;
		}

		event.preventDefault();

		activeDrag = {
			...activeDrag,
			x: event.clientX,
			y: event.clientY
		};
	}

	function handleWindowPointerUp(event: PointerEvent): void {
		if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
			return;
		}

		event.preventDefault();

		const finalDrag: ActiveDrag = {
			...activeDrag,
			x: event.clientX,
			y: event.clientY
		};

		const dragRect = getDragRect(finalDrag);
		const boardTarget = findBoardCellWithLargestOverlap(dragRect);

		if (boardTarget) {
			dropTileOnBoard(finalDrag.selection, boardTarget.row, boardTarget.col);
			finishActiveDrag();
			return;
		}

		if (finalDrag.selection.origin === 'board' && isRectOverRack(dragRect)) {
			returnBoardTileToRack(finalDrag.selection);
			finishActiveDrag();
			return;
		}

		message = 'A betű nem került táblamezőre. A lerakás megszakítva.';
		finishActiveDrag();
	}

	function cancelActiveDrag(): void {
		message = 'A húzás megszakítva.';
		finishActiveDrag();
	}

	function finishActiveDrag(): void {
		activeDrag = null;
		selectedTile = null;
		draggedTile = null;
		removeDragListeners();
	}

	function removeDragListeners(): void {
		window.removeEventListener('pointermove', handleWindowPointerMove);
		window.removeEventListener('pointerup', handleWindowPointerUp);
		window.removeEventListener('pointercancel', cancelActiveDrag);
	}

	function dropTileOnBoard(selection: TileSelection, row: number, col: number): void {
		const targetCell = board[row]?.[col];

		if (!targetCell) {
			errorMessage = 'Érvénytelen táblamező.';
			return;
		}

		if (targetCell.tile) {
			errorMessage =
				'A betű abba a mezőbe ugrott volna, amelyikben a legnagyobb felülete volt, de az a mező már foglalt.';
			return;
		}

		if (selection.tile.isJoker && selection.tile.letter === '*') {
			pendingJokerPlacement = {
				selection,
				row,
				col
			};

			message = 'Joker lerakva. Válaszd ki, milyen betűt jelent.';
			return;
		}

		commitPlacement(row, col, selection, selection.tile);
	}

	function commitPlacement(
		row: number,
		col: number,
		selection: TileSelection,
		placedTile: TileData
	): void {
		const nextBoard = cloneBoard(board);

		const tileForBoard: TileData = {
			...placedTile,
			source: 'player'
		};

		if (
			selection.origin === 'board' &&
			typeof selection.row === 'number' &&
			typeof selection.col === 'number'
		) {
			nextBoard[selection.row][selection.col] = {
				...nextBoard[selection.row][selection.col],
				tile: null,
				isNewPlacement: false,
				locked: false
			};
		}

		nextBoard[row][col] = {
			...nextBoard[row][col],
			tile: tileForBoard,
			isTitleCell: false,
			isNewPlacement: true,
			locked: false
		};

		board = nextBoard;

		if (selection.origin === 'rack') {
			rackTiles = rackTiles.filter((tile) => tile.id !== selection.tile.id);
		}

		placedThisRound = upsertPlacedTile(placedThisRound, {
			tileId: tileForBoard.id,
			row,
			col,
			letter: tileForBoard.letter,
			points: tileForBoard.points,
			isJoker: Boolean(tileForBoard.isJoker)
		});

		message = getPlacementMessage();
	}

	function upsertPlacedTile(
		currentPlacedTiles: PlacedTileData[],
		nextPlacedTile: PlacedTileData
	): PlacedTileData[] {
		return [
			...currentPlacedTiles.filter((tile) => tile.tileId !== nextPlacedTile.tileId),
			nextPlacedTile
		].sort((left, right) => {
			if (left.row !== right.row) {
				return left.row - right.row;
			}

			return left.col - right.col;
		});
	}

	function returnBoardTileToRack(selection: TileSelection): void {
		if (
			selection.origin !== 'board' ||
			typeof selection.row !== 'number' ||
			typeof selection.col !== 'number'
		) {
			return;
		}

		const nextBoard = cloneBoard(board);

		nextBoard[selection.row][selection.col] = {
			...nextBoard[selection.row][selection.col],
			tile: null,
			isNewPlacement: false,
			locked: false
		};

		board = nextBoard;

		const returnedTile: TileData = {
			...selection.tile,
			letter: selection.tile.isJoker ? '*' : selection.tile.letter,
			source: 'rack'
		};

		if (!rackTiles.some((tile) => tile.id === returnedTile.id)) {
			rackTiles = [...rackTiles, returnedTile];
		}

		placedThisRound = placedThisRound.filter((tile) => tile.tileId !== selection.tile.id);
		message = 'A betű visszakerült a rackbe.';
	}

	function handleJokerLetterConfirm(letter: string): void {
		if (!pendingJokerPlacement) {
			return;
		}

		const assignedJokerTile: TileData = {
			...pendingJokerPlacement.selection.tile,
			letter,
			source: 'player',
			isJoker: true
		};

		commitPlacement(
			pendingJokerPlacement.row,
			pendingJokerPlacement.col,
			pendingJokerPlacement.selection,
			assignedJokerTile
		);

		pendingJokerPlacement = null;
	}

	function handleJokerLetterCancel(): void {
		pendingJokerPlacement = null;
		message = 'A joker lerakása megszakítva.';
	}

	function resetLocalPlacements(): void {
		clearFeedback();

		if (!gameState) {
			return;
		}

		board = createBoardFromState(gameState);
		rackTiles = createRackFromState(gameState);
		placedThisRound = [];
		selectedTile = null;
		draggedTile = null;
		activeDrag = null;
		pendingJokerPlacement = null;
		message = 'A forduló helyi lerakásai törölve lettek.';
	}

	function getPlacementLineStatus(): { isValid: boolean; text: string; className: string } {
		if (placedThisRound.length === 0) {
			return {
				isValid: false,
				text: 'Ebben a fordulóban még nincs új lerakás.',
				className: 'placement-status--neutral'
			};
		}

		if (placedThisRound.length === 1) {
			return {
				isValid: true,
				text: 'Egy betű lerakva. Több betű esetén egy sorban vagy egy oszlopban kell maradni.',
				className: 'placement-status--ok'
			};
		}

		const firstRow = placedThisRound[0].row;
		const firstCol = placedThisRound[0].col;
		const sameRow = placedThisRound.every((tile) => tile.row === firstRow);
		const sameCol = placedThisRound.every((tile) => tile.col === firstCol);

		if (sameRow || sameCol) {
			return {
				isValid: true,
				text: 'A friss betűk egy sorban vagy egy oszlopban vannak.',
				className: 'placement-status--ok'
			};
		}

		return {
			isValid: false,
			text: 'A friss betűknek egy sorban vagy egy oszlopban kell lenniük.',
			className: 'placement-status--error'
		};
	}

	function getPlacementMessage(): string {
		const status = getPlacementLineStatus();

		return `${placedThisRound.length} betű lerakva ebben a fordulóban. ${status.text}`;
	}
</script>

<main class="game-page">
	<section class="game-control-panel" aria-label="Játék backend kapcsolat">
		<div class="game-control-header">
			<div>
				<p class="eyebrow">Backend kapcsolat</p>
				<h1>Játékállapot kezelése</h1>
			</div>

			{#if currentUser}
				<p class="game-control-user">
					Bejelentkezve: <strong>{currentUser.username}</strong> · ID: {currentUser.userId}
				</p>
			{/if}
		</div>

		{#if isLoading}
			<p class="game-control-note">Fiók és játékállapot ellenőrzése.</p>
		{:else}
			<div class="game-control-grid">
				<form class="game-control-form" onsubmit={handleCreateGame}>
					<label for="second-user-id">Ellenfél felhasználó ID</label>
					<div class="game-control-inline">
						<input
							id="second-user-id"
							type="number"
							min="1"
							placeholder="például 2"
							bind:value={secondUserIdInput}
						/>
						<button type="submit" disabled={isCreating}
							>{isCreating ? 'Létrehozás...' : 'Új játék'}</button
						>
					</div>
				</form>

				<form class="game-control-form" onsubmit={handleLoadGame}>
					<label for="game-id">Játék ID</label>
					<div class="game-control-inline">
						<input
							id="game-id"
							type="number"
							min="1"
							placeholder="például 1"
							bind:value={gameIdInput}
						/>
						<button type="submit" disabled={isRefreshing}
							>{isRefreshing ? 'Betöltés...' : 'Betöltés'}</button
						>
					</div>
				</form>

				<div class="game-control-actions">
					<button type="button" onclick={handleStartGame} disabled={!activeGameId || isStarting}>
						{isStarting ? 'Indítás...' : 'Forduló indítása'}
					</button>

					<button
						type="button"
						onclick={handleRefreshState}
						disabled={!activeGameId || isRefreshing}
					>
						{isRefreshing ? 'Frissítés...' : 'Állapot frissítése'}
					</button>
				</div>
			</div>

			{#if errorMessage}
				<p class="game-feedback game-feedback--error">{errorMessage}</p>
			{/if}

			{#if successMessage}
				<p class="game-feedback game-feedback--success">{successMessage}</p>
			{/if}
		{/if}
	</section>

	{#if gameState}
		<section class="game-state-summary" aria-label="Aktuális játékállapot">
			<div>
				<span>Játék ID</span>
				<strong>{gameState.game.id}</strong>
			</div>
			<div>
				<span>Állapot</span>
				<strong>{gameState.game.status}</strong>
			</div>
			<div>
				<span>Forduló</span>
				<strong>{gameState.game.round} / {gameState.game.maxRounds}</strong>
			</div>
			<div>
				<span>Betűk</span>
				<strong>{rackTiles.length}</strong>
			</div>
		</section>

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
				<GameBoard
					{board}
					title={boardTitle}
					helpText={boardHelpText}
					ownerName={boardOwnerName}
					activeDraggedTileId={draggedTile?.id ?? null}
					onCellPointerDown={handleBoardCellPointerDown}
				/>

				<TileRack
					tiles={rackTiles}
					activeDraggedTileId={draggedTile?.id ?? null}
					onRackTilePointerDown={handleRackTilePointerDown}
				/>

				<div class="game-bottom-actions">
					<ActionButtons
						onDictionaryCheck={handleDictionaryCheck}
						onSubmitMove={handleSubmitMove}
					/>
				</div>
			</section>
		</section>
	{:else if !isLoading}
		<section class="game-empty-state" aria-label="Nincs betöltött játék">
			<p class="eyebrow">Nincs aktív játék</p>
			<h2>Hozz létre egy új játékot, vagy tölts be egy meglévőt.</h2>
			<p>
				A backend bekötés után itt fog megjelenni a saját tábla, a két játékos, az aktuális forduló
				és a 10 közös betűcsempe.
			</p>
		</section>
	{/if}

	<section class="placement-panel" aria-label="Aktuális lerakás állapota">
		<div>
			<p class="eyebrow">Frontend lerakás</p>
			<h2>{placedThisRound.length} friss betű</h2>
			<p class={`placement-status ${getPlacementLineStatus().className}`}>
				{getPlacementLineStatus().text}
			</p>
		</div>

		<div class="placement-panel__details">
			<p>
				Húzott betű:
				<strong>{draggedTile ? draggedTile.letter : 'nincs'}</strong>
			</p>
			<p>
				Zárolt cellák:
				<strong>{lockedBoardTiles.length}</strong>
			</p>
		</div>

		<div class="placement-panel__actions">
			<button type="button" onclick={resetLocalPlacements} disabled={placedThisRound.length === 0}>
				Helyi lerakások törlése
			</button>
		</div>
	</section>
	{#if activeDrag && draggedTile}
		<div class="drag-preview" style={getDragPreviewStyle(activeDrag)} aria-hidden="true">
			<Tile tile={draggedTile} variant="rack" />
		</div>
	{/if}

	{#if pendingJokerPlacement}
		<JokerLetterDialog
			letters={JOKER_LETTERS}
			onConfirm={handleJokerLetterConfirm}
			onCancel={handleJokerLetterCancel}
		/>
	{/if}
</main>
