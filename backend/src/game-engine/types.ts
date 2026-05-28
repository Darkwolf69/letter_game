export type Tile = {
  id: string;
  letter: string;
  points: number;
  isJoker: boolean;
};

export type GameStatus = "CREATED" | "ROUND_ACTIVE" | "FINISHED";
export type RoundStatus = "ACTIVE" | "CLOSED";
export type BoardCellSource = "TITLE" | "PLAYER" | "JOKER";

export type BoardCell = {
  x: number;
  y: number;
  letter: string;
  points: number;
  isJoker: boolean;
  source: BoardCellSource;
  locked: boolean;
  createdRound: number | null;
};
