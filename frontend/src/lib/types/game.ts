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

export type GameStatus = 'CREATED' | 'ROUND_ACTIVE' | 'ROUND_EVALUATING' | 'FINISHED' | 'CANCELLED';

export type RoundStatus = 'ACTIVE' | 'CLOSED';

export type BoardCellSource = 'TITLE' | 'PLAYER' | 'JOKER';

export type MoveDirection = 'HORIZONTAL' | 'VERTICAL';

export type DictionaryCheckSource =
	| 'whitelist'
	| 'blacklist'
	| 'own_dictionary'
	| 'hunspell'
	| 'chars'
	| 'too_short'
	| 'rejected';

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

export type SubmittedMoveTile = {
	tileId: string;
	x: number;
	y: number;
	letter?: string;
};

export type ResolvedMoveTile = {
	tileId: string;
	x: number;
	y: number;
	letter: string;
	tilePoints: number;
	isJoker: boolean;
	source: BoardCellSource;
};

export type WordCell = {
	x: number;
	y: number;
	letter: string;
	scorePoints: number;
	isJoker: boolean;
	isNew: boolean;
	tileId: string | null;
};

export type MoveValidationErrorCode =
	| 'EMPTY_MOVE'
	| 'INVALID_COORDINATE'
	| 'DUPLICATE_TILE'
	| 'DUPLICATE_POSITION'
	| 'UNKNOWN_TILE'
	| 'LETTER_MISMATCH'
	| 'JOKER_LETTER_MISSING'
	| 'POSITION_OCCUPIED'
	| 'MOVE_NOT_IN_ONE_LINE'
	| 'DISCONNECTED_WORD'
	| 'TOUCHING_CREATES_EXTRA_WORD'
	| 'EXISTING_WORD_EXTENSION'
	| 'WORD_TOO_SHORT'
	| 'WORD_NOT_IN_DICTIONARY'
	| 'INVALID_SCORE';

export type MoveValidationFailure = {
	valid: false;
	code: MoveValidationErrorCode;
	message: string;
};

export type MoveValidationSuccess = {
	valid: true;
	word: string;
	direction: MoveDirection;
	startX: number;
	startY: number;
	score: number;
	dictionarySource: DictionaryCheckSource;
	submittedTiles: ResolvedMoveTile[];
	boardCellsToInsert: BackendBoardCell[];
	moveId?: number;
};

export type SubmitMoveResponse = MoveValidationSuccess | MoveValidationFailure;
