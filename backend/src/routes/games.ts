import express, { type Response } from "express";
import {
  createGame,
  getGameState,
  GameRepositoryError,
  startGame,
  submitMove,
  validateMoveSubmission,
} from "../repositories/gameRepository.js";

const router = express.Router();

function getAuthenticatedUser(
  req: express.Request,
  res: Response,
): Express.User | null {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: "Sikertelen azonosítás!" });
    return null;
  }

  return req.user;
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function handleGameRouteError(error: unknown, res: Response): void {
  if (error instanceof GameRepositoryError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Játékszerver hiba történt." });
}

router.post("/", async (req, res) => {
  const user = getAuthenticatedUser(req, res);
  if (!user) {
    return;
  }

  const secondUserId = toPositiveInteger(req.body.secondUserId);
  if (!secondUserId) {
    res
      .status(400)
      .json({ message: "A második játékos azonosítója kötelező." });
    return;
  }

  if (secondUserId === user.id) {
    res
      .status(400)
      .json({ message: "A két játékos nem lehet ugyanaz a felhasználó." });
    return;
  }

  try {
    const state = await createGame(user.id, secondUserId);
    res.status(201).json(state);
  } catch (error) {
    handleGameRouteError(error, res);
  }
});

router.post("/:id/start", async (req, res) => {
  const user = getAuthenticatedUser(req, res);
  if (!user) {
    return;
  }

  const gameId = toPositiveInteger(req.params.id);
  if (!gameId) {
    res.status(400).json({ message: "Érvénytelen játékazonosító." });
    return;
  }

  try {
    const state = await startGame(gameId, user.id);
    res.json(state);
  } catch (error) {
    handleGameRouteError(error, res);
  }
});

router.get("/:id/state", async (req, res) => {
  const user = getAuthenticatedUser(req, res);
  if (!user) {
    return;
  }

  const gameId = toPositiveInteger(req.params.id);
  if (!gameId) {
    res.status(400).json({ message: "Érvénytelen játékazonosító." });
    return;
  }

  try {
    const state = await getGameState(gameId, user.id);
    res.json(state);
  } catch (error) {
    handleGameRouteError(error, res);
  }
});

router.post("/:id/moves/validate", async (req, res) => {
  const user = getAuthenticatedUser(req, res);
  if (!user) {
    return;
  }

  const gameId = toPositiveInteger(req.params.id);
  if (!gameId) {
    res.status(400).json({ message: "Érvénytelen játékazonosító." });
    return;
  }

  if (!Array.isArray(req.body.tiles)) {
    res.status(400).json({
      message: "A beküldött ellenőrzés tiles tömböt vár.",
    });
    return;
  }

  try {
    const result = await validateMoveSubmission(
      gameId,
      user.id,
      req.body.tiles,
    );

    if (!result.valid) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    handleGameRouteError(error, res);
  }
});

router.post("/:id/moves", async (req, res) => {
  const user = getAuthenticatedUser(req, res);
  if (!user) {
    return;
  }

  const gameId = toPositiveInteger(req.params.id);
  if (!gameId) {
    res.status(400).json({ message: "Érvénytelen játékazonosító." });
    return;
  }

  if (!Array.isArray(req.body.tiles)) {
    res.status(400).json({
      message: "A beküldött lerakás tiles tömböt vár.",
    });
    return;
  }

  try {
    const result = await submitMove(gameId, user.id, req.body.tiles);

    if (!result.valid) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    handleGameRouteError(error, res);
  }
});

export default router;
