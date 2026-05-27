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
};

export type PlayerData = {
	id: string;
	name: string;
	score: number;
	isCurrent: boolean;
	status: 'Gondolkodik' | 'Kész' | 'Várakozik';
};
