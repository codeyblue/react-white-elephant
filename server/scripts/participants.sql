CREATE TABLE participants (
	`id` int AUTO_INCREMENT,
  `user_key` int NOT NULL,
  `game_key` int NOT NULL,
  `checked_in` bool DEFAULT FALSE,
  `turn` int DEFAULT NULL,
  `active_chooser` bool DEFAULT FALSE,
  `current_present_key` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_key`) REFERENCES users(`id`),
  FOREIGN KEY (`game_key`) REFERENCES games(`id`),
  FOREIGN KEY (`current_present_key`) REFERENCES presents(`id`)
)
