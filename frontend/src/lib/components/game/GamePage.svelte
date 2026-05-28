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

		return () => clearInterval(timerInterval);
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
				<GameBoard {board} title={boardTitle} helpText={boardHelpText} ownerName={boardOwnerName} />

				<TileRack tiles={rackTiles} />

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
</main>
