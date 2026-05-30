import type { ExtractedWord } from "./types.js";

export function calculateScore(extractedWord: ExtractedWord): number {
  return extractedWord.cells.reduce((sum, cell) => {
    return sum + cell.scorePoints;
  }, 0);
}
