import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { pool } from "../database.js";
import type { DictionaryCheckResult } from "./types.js";

type NSpellInstance = {
  correct(word: string): boolean;
};

type NSpellFactory = (aff: string, dic: string) => NSpellInstance;

type DictionaryRow = RowDataPacket & {
  word: string;
};

const require = createRequire(import.meta.url);
const nspell = require("nspell") as NSpellFactory;

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendRoot = path.resolve(currentDir, "../..");

const affPath = path.join(backendRoot, "dictionaries", "hu", "hu_HU.aff");
const dicPath = path.join(backendRoot, "dictionaries", "hu", "hu_HU.dic");

let spellPromise: Promise<NSpellInstance | null> | null = null;

function normalizeWord(word: string): string {
  return word.trim().toLocaleUpperCase("hu-HU");
}

function hasValidHungarianCharacters(word: string): boolean {
  return /^[A-ZÁÉÍÓÖŐÚÜŰ]+$/u.test(word);
}

async function loadSpell(): Promise<NSpellInstance | null> {
  if (!spellPromise) {
    spellPromise = Promise.all([
      fs.readFile(affPath, "utf8"),
      fs.readFile(dicPath, "utf8"),
    ])
      .then(([aff, dic]) => nspell(aff, dic))
      .catch((error: unknown) => {
        console.error("A Hunspell szótár nem tölthető be:", error);
        return null;
      });
  }

  return spellPromise;
}

async function wordExistsInTable(
  tableName: "dictionary_whitelist" | "dictionary_blacklist",
  normalizedWord: string,
): Promise<boolean> {
  const [rows] = await pool.execute<DictionaryRow[]>(
    `SELECT word FROM ${tableName} WHERE word = ? LIMIT 1`,
    [normalizedWord],
  );

  return rows.length > 0;
}

async function insertDictionaryAudit(
  normalizedWord: string,
  result: DictionaryCheckResult["source"],
): Promise<void> {
  await pool.execute(
    `INSERT INTO dictionary_audit (word, result)
     VALUES (?, ?)`,
    [normalizedWord, result],
  );
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

  const spell = await loadSpell();

  if (!spell) {
    await insertDictionaryAudit(normalizedWord, "rejected");

    return {
      accepted: false,
      normalizedWord,
      source: "rejected",
    };
  }

  const lowerCaseWord = normalizedWord.toLocaleLowerCase("hu-HU");
  const accepted =
    spell.correct(lowerCaseWord) || spell.correct(normalizedWord);

  await insertDictionaryAudit(
    normalizedWord,
    accepted ? "hunspell" : "rejected",
  );

  return {
    accepted,
    normalizedWord,
    source: accepted ? "hunspell" : "rejected",
  };
}
