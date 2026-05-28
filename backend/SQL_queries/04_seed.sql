USE letter_game_db;

INSERT INTO users (username, email, password, role)
VALUES 
  ('alice', 'alice@example.com', '$2a$12$eMER6VugDkXcNZYlApkfLurLTDwNwuoauegi5HFXWQAVcBkFad7Zy', 'ADMIN'),
  ('jay', 'jay@example.com', '$2a$12$Ekh29N1Aob.t0RN3HNRVNeiLRKpD14aCTyYeZ2WX8hhdBq1YBHGxe', 'PLAYER'),
  ('bob', 'bob@example.com', '$2a$12$JQcxAfTzYxXG4hBGriEq9.YVu4lVW9K8D3rDtqPf19ZpuWlRlEZpK', 'PLAYER');