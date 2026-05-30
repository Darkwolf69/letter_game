import { BOARD_HEIGHT, BOARD_WIDTH } from "./initialBoard.js";
import type {
  BoardCell,
  ExtractedWord,
  MoveDirection,
  MoveValidationFailure,
  ResolvedMoveTile,
  WordCell,
} from "./types.js";

type BoardMap = Map<string, WordCell>;

type DirectionVector = {
  dx: number;
  dy: number;
};

const DIRECTIONS: Record<MoveDirection, DirectionVector> = {
  HORIZONTAL: { dx: 1, dy: 0 },
  VERTICAL: { dx: 0, dy: 1 },
};

function keyOf(x: number, y: number): string {
  return `${x}:${y}`;
}

function isInsideBoard(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
}

function fail(
  code: MoveValidationFailure["code"],
  message: string,
): MoveValidationFailure {
  return { valid: false, code, message };
}

function createBoardMap(
  boardCells: BoardCell[],
  submittedTiles: ResolvedMoveTile[],
): BoardMap {
  const map: BoardMap = new Map();

  for (const cell of boardCells) {
    map.set(keyOf(cell.x, cell.y), {
      x: cell.x,
      y: cell.y,
      letter: cell.letter,
      scorePoints: 10,
      isJoker: cell.isJoker,
      isNew: false,
      tileId: null,
    });
  }

  for (const tile of submittedTiles) {
    map.set(keyOf(tile.x, tile.y), {
      x: tile.x,
      y: tile.y,
      letter: tile.letter,
      scorePoints: tile.tilePoints,
      isJoker: tile.isJoker,
      isNew: true,
      tileId: tile.tileId,
    });
  }

  return map;
}

function hasCell(map: BoardMap, x: number, y: number): boolean {
  return map.has(keyOf(x, y));
}

function getCell(map: BoardMap, x: number, y: number): WordCell | null {
  return map.get(keyOf(x, y)) ?? null;
}

function detectDirection(
  map: BoardMap,
  submittedTiles: ResolvedMoveTile[],
): MoveDirection | MoveValidationFailure {
  if (submittedTiles.length === 0) {
    return fail("EMPTY_MOVE", "Nincs beküldött betű.");
  }

  const sameRow = submittedTiles.every(
    (tile) => tile.y === submittedTiles[0].y,
  );
  const sameColumn = submittedTiles.every(
    (tile) => tile.x === submittedTiles[0].x,
  );

  if (submittedTiles.length > 1) {
    if (sameRow) {
      return "HORIZONTAL";
    }

    if (sameColumn) {
      return "VERTICAL";
    }

    return fail(
      "MOVE_NOT_IN_ONE_LINE",
      "Az új betűknek egy sorban vagy egy oszlopban kell lenniük.",
    );
  }

  const onlyTile = submittedTiles[0];

  const hasHorizontalNeighbour =
    hasCell(map, onlyTile.x - 1, onlyTile.y) ||
    hasCell(map, onlyTile.x + 1, onlyTile.y);

  const hasVerticalNeighbour =
    hasCell(map, onlyTile.x, onlyTile.y - 1) ||
    hasCell(map, onlyTile.x, onlyTile.y + 1);

  if (hasHorizontalNeighbour && hasVerticalNeighbour) {
    return fail(
      "TOUCHING_CREATES_EXTRA_WORD",
      "Az egyetlen új betű egyszerre vízszintes és függőleges szót is létrehozna.",
    );
  }

  if (hasVerticalNeighbour) {
    return "VERTICAL";
  }

  return "HORIZONTAL";
}

function scanWord(
  map: BoardMap,
  startX: number,
  startY: number,
  direction: MoveDirection,
): ExtractedWord {
  const vector = DIRECTIONS[direction];

  let x = startX;
  let y = startY;

  while (
    isInsideBoard(x - vector.dx, y - vector.dy) &&
    hasCell(map, x - vector.dx, y - vector.dy)
  ) {
    x -= vector.dx;
    y -= vector.dy;
  }

  const wordStartX = x;
  const wordStartY = y;
  const cells: WordCell[] = [];

  while (isInsideBoard(x, y) && hasCell(map, x, y)) {
    const cell = getCell(map, x, y);

    if (cell) {
      cells.push(cell);
    }

    x += vector.dx;
    y += vector.dy;
  }

  return {
    word: cells.map((cell) => cell.letter).join(""),
    direction,
    startX: wordStartX,
    startY: wordStartY,
    cells,
  };
}

function allSubmittedTilesAreInsideWord(
  extractedWord: ExtractedWord,
  submittedTiles: ResolvedMoveTile[],
): boolean {
  const wordPositions = new Set(
    extractedWord.cells.map((cell) => keyOf(cell.x, cell.y)),
  );

  return submittedTiles.every((tile) =>
    wordPositions.has(keyOf(tile.x, tile.y)),
  );
}

export function extractPrimaryWord(
  boardCells: BoardCell[],
  submittedTiles: ResolvedMoveTile[],
): ExtractedWord | MoveValidationFailure {
  const map = createBoardMap(boardCells, submittedTiles);
  const direction = detectDirection(map, submittedTiles);

  if (typeof direction !== "string") {
    return direction;
  }

  const firstTile = submittedTiles[0];
  const extractedWord = scanWord(map, firstTile.x, firstTile.y, direction);

  if (!allSubmittedTilesAreInsideWord(extractedWord, submittedTiles)) {
    return fail(
      "DISCONNECTED_WORD",
      "Az új betűk nem egy összefüggő szót alkotnak.",
    );
  }

  if (extractedWord.cells.length < 2) {
    return fail(
      "WORD_TOO_SHORT",
      "Legalább két betűből álló szót kell kirakni.",
    );
  }

  return extractedWord;
}

export function findTouchingSideWords(
  boardCells: BoardCell[],
  submittedTiles: ResolvedMoveTile[],
  direction: MoveDirection,
): ExtractedWord[] {
  const map = createBoardMap(boardCells, submittedTiles);
  const sideDirection: MoveDirection =
    direction === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";

  const sideWords: ExtractedWord[] = [];

  for (const tile of submittedTiles) {
    const sideWord = scanWord(map, tile.x, tile.y, sideDirection);

    if (sideWord.cells.length > 1) {
      sideWords.push(sideWord);
    }
  }

  return sideWords;
}

export function extendsExistingWord(
  boardCells: BoardCell[],
  extractedWord: ExtractedWord,
): boolean {
  const oldPositions = new Set(boardCells.map((cell) => keyOf(cell.x, cell.y)));
  const vector = DIRECTIONS[extractedWord.direction];

  for (const cell of extractedWord.cells) {
    const isOldCell = oldPositions.has(keyOf(cell.x, cell.y));

    if (!isOldCell) {
      continue;
    }

    const hasOldPrevious = oldPositions.has(
      keyOf(cell.x - vector.dx, cell.y - vector.dy),
    );

    const hasOldNext = oldPositions.has(
      keyOf(cell.x + vector.dx, cell.y + vector.dy),
    );

    if (hasOldPrevious || hasOldNext) {
      return true;
    }
  }

  return false;
}
