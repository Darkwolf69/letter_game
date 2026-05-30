import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { pool, getUserById } from "../database.js";
import { generateRoundTiles } from "../game-engine/generateTiles.js";
import { createInitialTitleCells } from "../game-engine/initialBoard.js";
import { validateMove } from "../game-engine/validateMove.js";
import type {
  MoveValidationResult,
  SubmittedMoveTile,
} from "../game-engine/types.js";
import type {
  BoardCell,
  GameStatus,
  RoundStatus,
  Tile,
} from "../game-engine/types.js";

export class GameRepositoryError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "GameRepositoryError";
  }
}

type GameRow = RowDataPacket & {
  id: number;
  status: GameStatus;
  round: number;
  max_rounds: number;
  first_user_id: number;
  second_user_id: number;
  created_at: Date;
  started_at: Date | null;
};

type PlayerRow = RowDataPacket & {
  user_id: number;
  username: string;
  player_order: number;
  total_score: number | string | null;
};

type RoundRow = RowDataPacket & {
  round_number: number;
  status: RoundStatus;
  started_at: Date;
  ended_at: Date | null;
};

type TileRow = RowDataPacket & {
  tile_id: string;
  letter: string;
  points: number;
  is_joker: number;
};

type BoardCellRow = RowDataPacket & {
  user_id: number;
  x: number;
  y: number;
  letter: string;
  points: number;
  is_joker: number;
  source: BoardCell["source"];
  locked: number;
  created_round: number | null;
};

type GameState = {
  game: {
    id: number;
    status: GameStatus;
    round: number;
    maxRounds: number;
    createdAt: Date;
    startedAt: Date | null;
  };
  players: Array<{
    userId: number;
    username: string;
    playerOrder: number;
    score: number;
  }>;
  round: null | {
    roundNumber: number;
    status: RoundStatus;
    startedAt: Date;
    endedAt: Date | null;
    tiles: Tile[];
  };
  boards: Record<number, { cells: BoardCell[] }>;
};

async function getGameById(
  gameId: number,
  connection?: PoolConnection,
): Promise<GameRow | undefined> {
  const executor = connection ?? pool;
  const [rows] = await executor.execute<GameRow[]>(
    `SELECT id, status, round, max_rounds, first_user_id, second_user_id, created_at, started_at
     FROM games
     WHERE id = ?`,
    [gameId],
  );

  return rows[0];
}

async function assertPlayerInGame(
  gameId: number,
  userId: number,
): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT user_id
     FROM game_players
     WHERE game_id = ? AND user_id = ?`,
    [gameId, userId],
  );

  if (rows.length === 0) {
    throw new GameRepositoryError(
      403,
      "A felhasználó nem résztvevője ennek a játéknak.",
    );
  }
}

async function insertInitialBoard(
  connection: PoolConnection,
  gameId: number,
  userId: number,
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `INSERT INTO boards (game_id, user_id) VALUES (?, ?)`,
    [gameId, userId],
  );

  const cells = createInitialTitleCells();

  for (const cell of cells) {
    await connection.execute<ResultSetHeader>(
      `INSERT INTO board_cells
       (game_id, user_id, x, y, letter, points, is_joker, source, locked, created_round)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gameId,
        userId,
        cell.x,
        cell.y,
        cell.letter,
        cell.points,
        cell.isJoker,
        cell.source,
        cell.locked,
        cell.createdRound,
      ],
    );
  }
}

export async function createGame(
  firstUserId: number,
  secondUserId: number,
): Promise<GameState> {
  const secondUser = await getUserById(secondUserId);

  if (!secondUser) {
    throw new GameRepositoryError(404, "A második játékos nem található.");
  }
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [gameResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO games (status, round, max_rounds, first_user_id, second_user_id)
       VALUES ('CREATED', 0, 7, ?, ?)`,
      [firstUserId, secondUserId],
    );

    const gameId = gameResult.insertId;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO game_players (game_id, user_id, player_order)
       VALUES (?, ?, 1), (?, ?, 2)`,
      [gameId, firstUserId, gameId, secondUserId],
    );

    await insertInitialBoard(connection, gameId, firstUserId);
    await insertInitialBoard(connection, gameId, secondUserId);

    await connection.commit();

    return getGameState(gameId, firstUserId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function startGame(
  gameId: number,
  userId: number,
): Promise<GameState> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const game = await getGameById(gameId, connection);
    if (!game) {
      throw new GameRepositoryError(404, "A játék nem található.");
    }

    const [playerRows] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id
       FROM game_players
       WHERE game_id = ? AND user_id = ?`,
      [gameId, userId],
    );

    if (playerRows.length === 0) {
      throw new GameRepositoryError(
        403,
        "A felhasználó nem résztvevője ennek a játéknak.",
      );
    }

    if (game.status === "CREATED") {
      const tiles = generateRoundTiles(10);

      await connection.execute<ResultSetHeader>(
        `INSERT INTO rounds (game_id, round_number, status, started_at)
         VALUES (?, 1, 'ACTIVE', NOW())`,
        [gameId],
      );

      for (const tile of tiles) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO round_tiles (game_id, round_number, tile_id, letter, points, is_joker)
           VALUES (?, 1, ?, ?, ?, ?)`,
          [gameId, tile.id, tile.letter, tile.points, tile.isJoker],
        );
      }

      await connection.execute<ResultSetHeader>(
        `UPDATE games
         SET status = 'ROUND_ACTIVE', round = 1, started_at = NOW()
         WHERE id = ?`,
        [gameId],
      );
    }

    await connection.commit();

    return getGameState(gameId, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getGameState(
  gameId: number,
  userId: number,
): Promise<GameState> {
  const game = await getGameById(gameId);

  if (!game) {
    throw new GameRepositoryError(404, "A játék nem található.");
  }

  await assertPlayerInGame(gameId, userId);

  const [playerRows] = await pool.execute<PlayerRow[]>(
    `SELECT
       gp.user_id,
       u.username,
       gp.player_order,
       COALESCE(SUM(s.score), 0) AS total_score
     FROM game_players gp
     INNER JOIN users u ON u.id = gp.user_id
     LEFT JOIN scores s ON s.game_id = gp.game_id AND s.user_id = gp.user_id
     WHERE gp.game_id = ?
     GROUP BY gp.user_id, u.username, gp.player_order
     ORDER BY gp.player_order ASC`,
    [gameId],
  );

  const [roundRows] = await pool.execute<RoundRow[]>(
    `SELECT round_number, status, started_at, ended_at
     FROM rounds
     WHERE game_id = ? AND round_number = ?`,
    [gameId, game.round],
  );

  const [tileRows] = await pool.execute<TileRow[]>(
    `SELECT tile_id, letter, points, is_joker
     FROM round_tiles
     WHERE game_id = ? AND round_number = ?
     ORDER BY id ASC`,
    [gameId, game.round],
  );

  const [cellRows] = await pool.execute<BoardCellRow[]>(
    `SELECT user_id, x, y, letter, points, is_joker, source, locked, created_round
     FROM board_cells
     WHERE game_id = ?
     ORDER BY user_id ASC, y ASC, x ASC`,
    [gameId],
  );

  const boards: GameState["boards"] = {};

  for (const player of playerRows) {
    boards[player.user_id] = { cells: [] };
  }

  for (const cell of cellRows) {
    if (!boards[cell.user_id]) {
      boards[cell.user_id] = { cells: [] };
    }

    boards[cell.user_id].cells.push({
      x: cell.x,
      y: cell.y,
      letter: cell.letter,
      points: cell.points,
      isJoker: Boolean(cell.is_joker),
      source: cell.source,
      locked: Boolean(cell.locked),
      createdRound: cell.created_round,
    });
  }

  return {
    game: {
      id: game.id,
      status: game.status,
      round: game.round,
      maxRounds: game.max_rounds,
      createdAt: game.created_at,
      startedAt: game.started_at,
    },
    players: playerRows.map((player) => ({
      userId: player.user_id,
      username: player.username,
      playerOrder: player.player_order,
      score: Number(player.total_score ?? 0),
    })),
    round:
      roundRows.length === 0
        ? null
        : {
            roundNumber: roundRows[0].round_number,
            status: roundRows[0].status,
            startedAt: roundRows[0].started_at,
            endedAt: roundRows[0].ended_at,
            tiles: tileRows.map((tile) => ({
              id: tile.tile_id,
              letter: tile.letter,
              points: tile.points,
              isJoker: Boolean(tile.is_joker),
            })),
          },
    boards,
  };
}

type ExistingMoveRow = RowDataPacket & {
  id: number;
};

type ActiveRoundRow = RowDataPacket & {
  round_number: number;
  status: RoundStatus;
};

function mapTileRowsToTiles(rows: TileRow[]): Tile[] {
  return rows.map((tile) => ({
    id: tile.tile_id,
    letter: tile.letter,
    points: tile.points,
    isJoker: Boolean(tile.is_joker),
  }));
}

function mapBoardRowsToCells(rows: BoardCellRow[]): BoardCell[] {
  return rows.map((cell) => ({
    x: cell.x,
    y: cell.y,
    letter: cell.letter,
    points: cell.points,
    isJoker: Boolean(cell.is_joker),
    source: cell.source,
    locked: Boolean(cell.locked),
    createdRound: cell.created_round,
  }));
}

async function assertPlayerInGameWithConnection(
  connection: PoolConnection,
  gameId: number,
  userId: number,
): Promise<void> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT user_id
     FROM game_players
     WHERE game_id = ? AND user_id = ?`,
    [gameId, userId],
  );

  if (rows.length === 0) {
    throw new GameRepositoryError(
      403,
      "A felhasználó nem résztvevője ennek a játéknak.",
    );
  }
}

export async function submitMove(
  gameId: number,
  userId: number,
  submittedTiles: SubmittedMoveTile[],
): Promise<MoveValidationResult & { moveId?: number }> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const game = await getGameById(gameId, connection);

    if (!game) {
      throw new GameRepositoryError(404, "A játék nem található.");
    }

    await assertPlayerInGameWithConnection(connection, gameId, userId);

    if (game.status !== "ROUND_ACTIVE") {
      throw new GameRepositoryError(
        409,
        "Nincs aktív forduló ebben a játékban.",
      );
    }

    const [roundRows] = await connection.execute<ActiveRoundRow[]>(
      `SELECT round_number, status
       FROM rounds
       WHERE game_id = ? AND round_number = ? AND status = 'ACTIVE'
       LIMIT 1`,
      [gameId, game.round],
    );

    if (roundRows.length === 0) {
      throw new GameRepositoryError(
        409,
        "Nincs aktív forduló ebben a játékban.",
      );
    }

    const [existingMoveRows] = await connection.execute<ExistingMoveRow[]>(
      `SELECT id
       FROM moves
       WHERE game_id = ? AND user_id = ? AND round_number = ?
       LIMIT 1`,
      [gameId, userId, game.round],
    );

    if (existingMoveRows.length > 0) {
      throw new GameRepositoryError(
        409,
        "Ebben a fordulóban ez a játékos már küldött be lerakást.",
      );
    }

    const [tileRows] = await connection.execute<TileRow[]>(
      `SELECT tile_id, letter, points, is_joker
       FROM round_tiles
       WHERE game_id = ? AND round_number = ?
       ORDER BY id ASC`,
      [gameId, game.round],
    );

    const [cellRows] = await connection.execute<BoardCellRow[]>(
      `SELECT user_id, x, y, letter, points, is_joker, source, locked, created_round
       FROM board_cells
       WHERE game_id = ? AND user_id = ?
       ORDER BY y ASC, x ASC`,
      [gameId, userId],
    );

    const validation = await validateMove({
      roundNumber: game.round,
      boardCells: mapBoardRowsToCells(cellRows),
      roundTiles: mapTileRowsToTiles(tileRows),
      submittedTiles,
    });

    if (!validation.valid) {
      await connection.rollback();
      return validation;
    }

    const [moveResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO moves
       (game_id, user_id, round_number, word, direction, start_x, start_y, score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACCEPTED')`,
      [
        gameId,
        userId,
        game.round,
        validation.word,
        validation.direction,
        validation.startX,
        validation.startY,
        validation.score,
      ],
    );

    const moveId = moveResult.insertId;

    for (const cell of validation.boardCellsToInsert) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO board_cells
         (game_id, user_id, x, y, letter, points, is_joker, source, locked, created_round)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gameId,
          userId,
          cell.x,
          cell.y,
          cell.letter,
          cell.points,
          cell.isJoker,
          cell.source,
          cell.locked,
          cell.createdRound,
        ],
      );
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO scores
       (game_id, user_id, round_number, move_id, score, reason)
       VALUES (?, ?, ?, ?, ?, 'MOVE')`,
      [gameId, userId, game.round, moveId, validation.score],
    );

    await connection.commit();

    return {
      ...validation,
      moveId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
