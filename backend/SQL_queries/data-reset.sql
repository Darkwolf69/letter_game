USE letter_game_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear junction tables first

-- Clear core tables (order does matter due to foreign key dependencies)
DELETE FROM scores;
DELETE FROM games;
DELETE FROM users;
DELETE FROM sessions;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

