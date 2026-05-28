export type TileSource = 'title' | 'player' | 'rack';

export type TileData = {
	id: string;
	letter: string;
	points: number;
	source: TileSource;
	isJoker?: boolean;
};

export type BoardCellData = {
	row: number;
	col: number;
	tile: TileData | null;
	isTitleCell?: boolean;
	isNewPlacement?: boolean;
	locked?: boolean;
};

export type PlayerStatus = 'Gondolkodik' | 'Kész' | 'Várakozik';

export type PlayerData = {
	id: string;
	userId: number;
	name: string;
	score: number;
	isCurrent: boolean;
	status: PlayerStatus;
};

export type GameStatus = 'CREATED' | 'ROUND_ACTIVE' | 'FINISHED';
export type RoundStatus = 'ACTIVE' | 'CLOSED';
export type BoardCellSource = 'TITLE' | 'PLAYER' | 'JOKER';

export type BackendTile = {
	id: string;
	letter: string;
	points: number;
	isJoker: boolean;
};

export type BackendBoardCell = {
	x: number;
	y: number;
	letter: string;
	points: number;
	isJoker: boolean;
	source: BoardCellSource;
	locked: boolean;
	createdRound: number | null;
};

export type GameStateResponse = {
	game: {
		id: number;
		status: GameStatus;
		round: number;
		maxRounds: number;
		createdAt: string;
		startedAt: string | null;
	};
	players: Array<{
		userId: number;
		username: string;
		playerOrder: number;
		score: number;
	}>;
	round: null | {
		roundNumber: number;
		status: RoundStatus;
		startedAt: string;
		endedAt: string | null;
		tiles: BackendTile[];
	};
	boards: Record<number, { cells: BackendBoardCell[] }>;
};
