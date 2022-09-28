CREATE TABLE `presents` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'primary key',
  `gifter` varchar(255) NOT NULL COMMENT 'person who brought gift',
  `status` enum('wrapped','open','locked') DEFAULT 'wrapped' COMMENT 'status of the present either wrapped, open, or locked',
  `holder` int DEFAULT NULL COMMENT 'user id of person currently holding the present',
  `game_key` int NOT NULL COMMENT 'reference to game id the present belongs to',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`game_key`) REFERENCES games(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
