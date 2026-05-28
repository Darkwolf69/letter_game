import { randomUUID } from "node:crypto";
import type { Tile } from "./types.js";

type WeightedLetter = {
  letter: string;
  weight: number;
};

const LETTER_BAG: readonly WeightedLetter[] = [
  { letter: "A", weight: 9 },
  { letter: "Á", weight: 4 },
  { letter: "B", weight: 2 },
  { letter: "C", weight: 1 },
  { letter: "CS", weight: 1 },
  { letter: "D", weight: 3 },
  { letter: "DZS", weight: 0.1 },
  { letter: "E", weight: 10 },
  { letter: "É", weight: 4 },
  { letter: "F", weight: 1.5 },
  { letter: "G", weight: 2 },
  { letter: "GY", weight: 1 },
  { letter: "H", weight: 2 },
  { letter: "I", weight: 4 },
  { letter: "Í", weight: 1 },
  { letter: "J", weight: 2 },
  { letter: "K", weight: 4 },
  { letter: "L", weight: 5 },
  { letter: "LY", weight: 0.5 },
  { letter: "M", weight: 3 },
  { letter: "N", weight: 6 },
  { letter: "NY", weight: 1 },
  { letter: "O", weight: 4 },
  { letter: "Ó", weight: 2 },
  { letter: "Ö", weight: 1 },
  { letter: "Ő", weight: 0.5 },
  { letter: "P", weight: 1.5 },
  { letter: "R", weight: 6 },
  { letter: "S", weight: 4 },
  { letter: "SZ", weight: 3 },
  { letter: "T", weight: 7 },
  { letter: "TY", weight: 0.5 },
  { letter: "U", weight: 1 },
  { letter: "Ú", weight: 1 },
  { letter: "Ü", weight: 0.5 },
  { letter: "Ű", weight: 0.2 },
  { letter: "V", weight: 2 },
  { letter: "Z", weight: 2 },
  { letter: "ZS", weight: 0.5 },
  { letter: "*", weight: 0.6 },
];

const TOTAL_WEIGHT = LETTER_BAG.reduce((sum, item) => sum + item.weight, 0);

function pickWeightedLetter(): string {
  let value = Math.random() * TOTAL_WEIGHT;

  for (const item of LETTER_BAG) {
    value -= item.weight;
    if (value <= 0) {
      return item.letter;
    }
  }

  return LETTER_BAG[LETTER_BAG.length - 1].letter;
}

function randomPointValue(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function generateRoundTiles(count = 10): Tile[] {
  return Array.from({ length: count }, () => {
    const letter = pickWeightedLetter();
    const isJoker = letter === "*";

    return {
      id: randomUUID(),
      letter,
      points: isJoker ? 0 : randomPointValue(),
      isJoker,
    };
  });
}
