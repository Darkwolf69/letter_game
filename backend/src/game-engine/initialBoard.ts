// backend/src/game-engine/initialBoard.ts

import type { BoardCell } from "./types.js";

export const BOARD_WIDTH = 17;
export const BOARD_HEIGHT = 12;

type TitleCellPlacement = {
  x: number;
  y: number;
  letter: string;
};

const TITLE_CELL_PLACEMENTS: TitleCellPlacement[] = [
  ...createVerticalWord("JÁTÉK", 6, 2),
  { x: 4, y: 8, letter: "A" },
  ...createHorizontalWord("BETŰKKEL", 8, 9),
];

export function createInitialTitleCells(): BoardCell[] {
  return TITLE_CELL_PLACEMENTS.map((cell) => ({
    x: cell.x,
    y: cell.y,
    letter: cell.letter,
    points: 10,
    isJoker: false,
    source: "TITLE" as const,
    locked: true,
    createdRound: 0,
  }));
}

function createHorizontalWord(
  word: string,
  startX: number,
  y: number,
): TitleCellPlacement[] {
  return Array.from(word).map((letter, index) => ({
    x: startX + index,
    y,
    letter,
  }));
}

function createVerticalWord(
  word: string,
  x: number,
  startY: number,
): TitleCellPlacement[] {
  return Array.from(word).map((letter, index) => ({
    x,
    y: startY + index,
    letter,
  }));
}
