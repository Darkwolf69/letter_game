import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { pool } from "../database.js";
import type { DictionaryCheckResult } from "./types.js";

type DictionaryRow = RowDataPacket & {
  word: string;
};

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendRoot = path.resolve(currentDir, "../..");

const dicPath = path.join(backendRoot, "dictionaries", "hu", "hu_HU.dic");

let hunspellWordSetPromise: Promise<Set<string>> | null = null;

function normalizeWord(word: string): string {
  return word.trim().toLocaleUpperCase("hu-HU");
}

function hasValidHungarianCharacters(word: string): boolean {
  return /^[A-ZÁÉÍÓÖŐÚÜŰ]+$/u.test(word);
}

function normalizeDictionaryLine(line: string): string | null {
  const trimmedLine = line.trim();

  if (trimmedLine.length === 0) {
    return null;
  }

  if (/^\d+$/.test(trimmedLine)) {
    return null;
  }

  const wordWithoutFlags = trimmedLine.split("/")[0]?.trim();

  if (!wordWithoutFlags) {
    return null;
  }

  const normalizedWord = normalizeWord(wordWithoutFlags);

  if (!hasValidHungarianCharacters(normalizedWord)) {
    return null;
  }

  return normalizedWord;
}

async function loadHunspellDictionaryWords(): Promise<Set<string>> {
  if (!hunspellWordSetPromise) {
    hunspellWordSetPromise = fs
      .readFile(dicPath, "utf8")
      .then((content) => {
        const words = new Set<string>();

        for (const line of content.split(/\r?\n/u)) {
          const normalizedWord = normalizeDictionaryLine(line);

          if (normalizedWord) {
            words.add(normalizedWord);
          }
        }

        return words;
      })
      .catch((error: unknown) => {
        console.error("A Hunspell .dic szótár nem tölthető be:", error);
        return new Set<string>();
      });
  }

  return hunspellWordSetPromise;
}

async function wordExistsInTable(
  tableName:
    | "dictionary_whitelist"
    | "dictionary_blacklist"
    | "dictionary_words",
  normalizedWord: string,
): Promise<boolean> {
  try {
    const [rows] = await pool.execute<DictionaryRow[]>(
      `SELECT word FROM ${tableName} WHERE word = ? LIMIT 1`,
      [normalizedWord],
    );

    return rows.length > 0;
  } catch (error) {
    console.error(`A ${tableName} tábla nem olvasható:`, error);
    return false;
  }
}

async function insertDictionaryAudit(
  normalizedWord: string,
  result: DictionaryCheckResult["source"],
): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO dictionary_audit (word, result)
       VALUES (?, ?)`,
      [normalizedWord, result],
    );
  } catch (error) {
    console.error("A dictionary_audit naplózás sikertelen:", error);
  }
}

export async function checkDictionaryWord(
  word: string,
): Promise<DictionaryCheckResult> {
  const normalizedWord = normalizeWord(word);

  if (normalizedWord.length < 2) {
    await insertDictionaryAudit(normalizedWord, "too_short");

    return {
      accepted: false,
      normalizedWord,
      source: "too_short",
    };
  }

  if (!hasValidHungarianCharacters(normalizedWord)) {
    await insertDictionaryAudit(normalizedWord, "chars");

    return {
      accepted: false,
      normalizedWord,
      source: "chars",
    };
  }

  const isBlacklisted = await wordExistsInTable(
    "dictionary_blacklist",
    normalizedWord,
  );

  if (isBlacklisted) {
    await insertDictionaryAudit(normalizedWord, "blacklist");

    return {
      accepted: false,
      normalizedWord,
      source: "blacklist",
    };
  }

  const isWhitelisted = await wordExistsInTable(
    "dictionary_whitelist",
    normalizedWord,
  );

  if (isWhitelisted) {
    await insertDictionaryAudit(normalizedWord, "whitelist");

    return {
      accepted: true,
      normalizedWord,
      source: "whitelist",
    };
  }

  const isOwnDictionaryWord = await wordExistsInTable(
    "dictionary_words",
    normalizedWord,
  );

  if (isOwnDictionaryWord) {
    await insertDictionaryAudit(normalizedWord, "own_dictionary");

    return {
      accepted: true,
      normalizedWord,
      source: "own_dictionary",
    };
  }

  const hunspellWords = await loadHunspellDictionaryWords();

  if (hunspellWords.has(normalizedWord)) {
    await insertDictionaryAudit(normalizedWord, "hunspell");

    return {
      accepted: true,
      normalizedWord,
      source: "hunspell",
    };
  }

  await insertDictionaryAudit(normalizedWord, "rejected");

  return {
    accepted: false,
    normalizedWord,
    source: "rejected",
  };
}
