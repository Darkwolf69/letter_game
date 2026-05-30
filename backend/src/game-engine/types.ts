export type Tile = {
  id: string;
  letter: string;
  points: number;
  isJoker: boolean;
};

export type GameStatus =
  | "CREATED"
  | "ROUND_ACTIVE"
  | "ROUND_EVALUATING"
  | "FINISHED"
  | "CANCELLED";

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

export type MoveDirection = "HORIZONTAL" | "VERTICAL";

export type MoveStatus = "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED";

export type ScoreReason = "MOVE" | "BONUS" | "PENALTY" | "ROUND";

export type SubmittedMoveTile = {
  tileId: string;
  x: number;
  y: number;

  /**
   * Normál betűnél opcionális ellenőrző mező.
   * Jokernél kötelező: ez mutatja, milyen betűt jelent a joker.
   */
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

export type ExtractedWord = {
  word: string;
  direction: MoveDirection;
  startX: number;
  startY: number;
  cells: WordCell[];
};

export type DictionaryCheckResult = {
  accepted: boolean;
  normalizedWord: string;
  source:
    | "whitelist"
    | "blacklist"
    | "hunspell"
    | "chars"
    | "too_short"
    | "rejected";
};

export type MoveValidationErrorCode =
  | "EMPTY_MOVE"
  | "INVALID_COORDINATE"
  | "DUPLICATE_TILE"
  | "DUPLICATE_POSITION"
  | "UNKNOWN_TILE"
  | "LETTER_MISMATCH"
  | "JOKER_LETTER_MISSING"
  | "POSITION_OCCUPIED"
  | "MOVE_NOT_IN_ONE_LINE"
  | "DISCONNECTED_WORD"
  | "TOUCHING_CREATES_EXTRA_WORD"
  | "EXISTING_WORD_EXTENSION"
  | "WORD_TOO_SHORT"
  | "WORD_NOT_IN_DICTIONARY"
  | "INVALID_SCORE";

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
  submittedTiles: ResolvedMoveTile[];
  boardCellsToInsert: BoardCell[];
};

export type MoveValidationResult =
  | MoveValidationSuccess
  | MoveValidationFailure;
