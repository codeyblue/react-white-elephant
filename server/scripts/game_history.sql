CREATE TABLE `game_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event` enum('open','steal') DEFAULT NULL,
  `game_key` int NOT NULL,
  `present_key` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`game_key`) REFERENCES `games` (`id`),
  FOREIGN KEY (`present_key`) REFERENCES `presents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
