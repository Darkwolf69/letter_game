CREATE DATABASE IF NOT EXISTS letter_game_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_hungarian_ci;

USE letter_game_db;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(128) NOT NULL UNIQUE,
  password VARCHAR(256) NOT NULL,
  role ENUM('ADMIN', 'PLAYER') NOT NULL DEFAULT 'PLAYER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  status ENUM(
    'CREATED',
    'ROUND_ACTIVE',
    'ROUND_EVALUATING',
    'FINISHED',
    'CANCELLED't
  ) NOT NULL DEFAULT 'CREATED',
  round INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 7,
  first_user_id INTEGER NOT NULL,
  second_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,

  CONSTRAINT fk_games_first_user
    FOREIGN KEY (first_user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_games_second_user
    FOREIGN KEY (second_user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT,

  INDEX idx_games_status (status),
  INDEX idx_games_first_user (first_user_id),
  INDEX idx_games_second_user (second_user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS game_players (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  player_order TINYINT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_game_players_game
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_game_players_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_game_players_game_user
    UNIQUE (game_id, user_id),

  CONSTRAINT uq_game_players_game_order
    UNIQUE (game_id, player_order),

  INDEX idx_game_players_user (user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  status ENUM('ACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,

  CONSTRAINT fk_rounds_game
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_rounds_game_round
    UNIQUE (game_id, round_number),

  INDEX idx_rounds_game_status (game_id, status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS round_tiles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  tile_id VARCHAR(64) NOT NULL,
  letter VARCHAR(8) NOT NULL,
  points INTEGER NOT NULL,
  is_joker BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_round_tiles_round
    FOREIGN KEY (game_id, round_number)
    REFERENCES rounds(game_id, round_number)
    ON DELETE CASCADE,

  CONSTRAINT uq_round_tiles_tile
    UNIQUE (game_id, round_number, tile_id),

  INDEX idx_round_tiles_round (game_id, round_number)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_boards_game
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_boards_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_boards_game_player
    FOREIGN KEY (game_id, user_id)
    REFERENCES game_players(game_id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_boards_game_user
    UNIQUE (game_id, user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS board_cells (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  letter VARCHAR(8) NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  is_joker BOOLEAN NOT NULL DEFAULT FALSE,
  source ENUM('TITLE', 'PLAYER', 'JOKER') NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_round INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_board_cells_board
    FOREIGN KEY (game_id, user_id)
    REFERENCES boards(game_id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_board_cells_position
    UNIQUE (game_id, user_id, x, y),

  INDEX idx_board_cells_game_user (game_id, user_id),
  INDEX idx_board_cells_round (game_id, user_id, created_round)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  word VARCHAR(128) NOT NULL,
  direction ENUM('HORIZONTAL', 'VERTICAL') NOT NULL,
  start_x INTEGER NOT NULL,
  start_y INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  status ENUM('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  rejection_reason VARCHAR(255) NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_moves_round
    FOREIGN KEY (game_id, round_number)
    REFERENCES rounds(game_id, round_number)
    ON DELETE CASCADE,

  CONSTRAINT fk_moves_game_player
    FOREIGN KEY (game_id, user_id)
    REFERENCES game_players(game_id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_moves_one_submission_per_round
    UNIQUE (game_id, user_id, round_number),

  INDEX idx_moves_game_round (game_id, round_number),
  INDEX idx_moves_user (user_id),
  INDEX idx_moves_status (status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  game_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  move_id INTEGER NULL,
  score INTEGER NOT NULL,
  reason ENUM('MOVE', 'BONUS', 'PENALTY', 'ROUND') NOT NULL DEFAULT 'MOVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_scores_round
    FOREIGN KEY (game_id, round_number)
    REFERENCES rounds(game_id, round_number)
    ON DELETE CASCADE,

  CONSTRAINT fk_scores_game_player
    FOREIGN KEY (game_id, user_id)
    REFERENCES game_players(game_id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_scores_move
    FOREIGN KEY (move_id)
    REFERENCES moves(id)
    ON DELETE SET NULL,

  INDEX idx_scores_game_user (game_id, user_id),
  INDEX idx_scores_game_round (game_id, round_number)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS dictionary_whitelist (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  word VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS dictionary_blacklist (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  word VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;

CREATE TABLE IF NOT EXISTS dictionary_audit (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  word VARCHAR(128) NOT NULL,
  proper_candidate BOOLEAN NOT NULL DEFAULT FALSE,
  result ENUM(
    'ok',
    'whitelist',
    'blacklist',
    'hunspell',
    'chars',
    'proper',
    'too_short',
    'rejected'
  ) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_dictionary_audit_created_at (created_at),
  INDEX idx_dictionary_audit_word (word)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci;