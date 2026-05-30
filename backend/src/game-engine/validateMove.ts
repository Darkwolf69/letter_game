import { BOARD_HEIGHT, BOARD_WIDTH } from "./initialBoard.js";
import { calculateScore } from "./calculateScore.js";
import { checkDictionaryWord } from "./dictionary.js";
import {
  extractPrimaryWord,
  extendsExistingWord,
  findTouchingSideWords,
} from "./extractWord.js";
import type {
  BoardCell,
  MoveValidationFailure,
  MoveValidationResult,
  ResolvedMoveTile,
  SubmittedMoveTile,
  Tile,
} from "./types.js";

type ValidateMoveInput = {
  roundNumber: number;
  boardCells: BoardCell[];
  roundTiles: Tile[];
  submittedTiles: SubmittedMoveTile[];
};

function fail(
  code: MoveValidationFailure["code"],
  message: string,
): MoveValidationFailure {
  return { valid: false, code, message };
}

function isMoveValidationFailure(
  result: unknown,
): result is MoveValidationFailure {
  return (
    typeof result === "object" &&
    result !== null &&
    "valid" in result &&
    result.valid === false
  );
}

function keyOf(x: number, y: number): string {
  return `${x}:${y}`;
}

function normalizeLetter(letter: string): string {
  return letter.trim().toLocaleUpperCase("hu-HU");
}

function isInsideBoard(x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < BOARD_WIDTH &&
    y >= 0 &&
    y < BOARD_HEIGHT
  );
}

function resolveSubmittedTiles(
  boardCells: BoardCell[],
  roundTiles: Tile[],
  submittedTiles: SubmittedMoveTile[],
): ResolvedMoveTile[] | MoveValidationFailure {
  if (submittedTiles.length === 0) {
    return fail("EMPTY_MOVE", "Nincs beküldött betű.");
  }

  const roundTilesById = new Map(roundTiles.map((tile) => [tile.id, tile]));
  const usedTileIds = new Set<string>();
  const usedPositions = new Set<string>();
  const occupiedPositions = new Set(
    boardCells.map((cell) => keyOf(cell.x, cell.y)),
  );

  const resolvedTiles: ResolvedMoveTile[] = [];

  for (const submittedTile of submittedTiles) {
    if (!isInsideBoard(submittedTile.x, submittedTile.y)) {
      return fail(
        "INVALID_COORDINATE",
        "A beküldött lerakás tartalmaz táblán kívüli koordinátát.",
      );
    }

    if (usedTileIds.has(submittedTile.tileId)) {
      return fail(
        "DUPLICATE_TILE",
        "Ugyanazt a betűkockát nem lehet kétszer felhasználni.",
      );
    }

    usedTileIds.add(submittedTile.tileId);

    const positionKey = keyOf(submittedTile.x, submittedTile.y);

    if (usedPositions.has(positionKey)) {
      return fail(
        "DUPLICATE_POSITION",
        "Két új betű nem kerülhet ugyanarra a mezőre.",
      );
    }

    usedPositions.add(positionKey);

    if (occupiedPositions.has(positionKey)) {
      return fail(
        "POSITION_OCCUPIED",
        "A játékos nem írhat felül és nem mozgathat régi betűt.",
      );
    }

    const roundTile = roundTilesById.get(submittedTile.tileId);

    if (!roundTile) {
      return fail(
        "UNKNOWN_TILE",
        "A beküldött betű nem a forduló betűkészletéből származik.",
      );
    }

    if (roundTile.isJoker) {
      if (!submittedTile.letter) {
        return fail(
          "JOKER_LETTER_MISSING",
          "Joker használatakor meg kell adni, milyen betűt jelent.",
        );
      }

      const jokerLetter = normalizeLetter(submittedTile.letter);

      if (jokerLetter === "*" || jokerLetter.length === 0) {
        return fail(
          "JOKER_LETTER_MISSING",
          "A joker nem maradhat csillag a beküldött szóban.",
        );
      }

      resolvedTiles.push({
        tileId: roundTile.id,
        x: submittedTile.x,
        y: submittedTile.y,
        letter: jokerLetter,
        tilePoints: roundTile.points,
        isJoker: true,
        source: "JOKER",
      });

      continue;
    }

    const expectedLetter = normalizeLetter(roundTile.letter);
    const submittedLetter = submittedTile.letter
      ? normalizeLetter(submittedTile.letter)
      : expectedLetter;

    if (submittedLetter !== expectedLetter) {
      return fail(
        "LETTER_MISMATCH",
        "A beküldött betű nem egyezik a forduló betűkockájával.",
      );
    }

    resolvedTiles.push({
      tileId: roundTile.id,
      x: submittedTile.x,
      y: submittedTile.y,
      letter: expectedLetter,
      tilePoints: roundTile.points,
      isJoker: false,
      source: "PLAYER",
    });
  }

  return resolvedTiles;
}

function createBoardCellsToInsert(
  roundNumber: number,
  resolvedTiles: ResolvedMoveTile[],
): BoardCell[] {
  return resolvedTiles.map((tile) => ({
    x: tile.x,
    y: tile.y,
    letter: tile.letter,
    points: 10,
    isJoker: tile.isJoker,
    source: tile.source,
    locked: true,
    createdRound: roundNumber,
  }));
}

export async function validateMove(
  input: ValidateMoveInput,
): Promise<MoveValidationResult> {
  const resolvedTiles = resolveSubmittedTiles(
    input.boardCells,
    input.roundTiles,
    input.submittedTiles,
  );

  if (isMoveValidationFailure(resolvedTiles)) {
    return resolvedTiles;
  }

  const extractedWordResult = extractPrimaryWord(
    input.boardCells,
    resolvedTiles,
  );

  if (isMoveValidationFailure(extractedWordResult)) {
    return extractedWordResult;
  }

  const extractedWord = extractedWordResult;

  const sideWords = findTouchingSideWords(
    input.boardCells,
    resolvedTiles,
    extractedWord.direction,
  );

  if (sideWords.length > 0) {
    return fail(
      "TOUCHING_CREATES_EXTRA_WORD",
      "A lerakás tapasztást okoz, vagyis a fő szón kívül másik szó is létrejön.",
    );
  }

  if (extendsExistingWord(input.boardCells, extractedWord)) {
    return fail(
      "EXISTING_WORD_EXTENSION",
      "Meglévő szó bővítése nem megengedett.",
    );
  }

  const dictionaryResult = await checkDictionaryWord(extractedWord.word);

  if (!dictionaryResult.accepted) {
    return fail(
      "WORD_NOT_IN_DICTIONARY",
      `A szó nem szerepel a szótárban: ${dictionaryResult.normalizedWord}`,
    );
  }

  const score = calculateScore(extractedWord);

  if (!Number.isInteger(score) || score <= 0) {
    return fail("INVALID_SCORE", "A pontszám nem számítható ki szabályosan.");
  }

  return {
    valid: true,
    word: dictionaryResult.normalizedWord,
    direction: extractedWord.direction,
    startX: extractedWord.startX,
    startY: extractedWord.startY,
    score,
    submittedTiles: resolvedTiles,
    boardCellsToInsert: createBoardCellsToInsert(
      input.roundNumber,
      resolvedTiles,
    ),
  };
}
