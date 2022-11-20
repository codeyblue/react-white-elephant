CREATE TABLE `games` (
  `id` int AUTO_INCREMENT,
  `administrator` int NOT NULL,
  `status` enum('setup','ready','inprogress','final_round','complete') DEFAULT 'setup',
  `round` int DEFAULT NULL,
  `active_participant` int DEFAULT NULL,
  `last_stolen_present` int DEFAULT NULL,
  `rule_maxstealsperpresent` int DEFAULT 3,
  `rule_maxstealsperround` int DEFAULT -1,
  `rule_firstpersonsecondchance` bool DEFAULT true,
  `rule_extraround` bool DEFAULT true,
  `rule_blocklaststolen` bool DEFAULT true,
  `conference_link` varchar(255) DEFAULT null,
  `date` date DEFAULT null,
  `name` varchar(255) DEFAULT null,
  `time` varchar(255) DEFAULT null,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`administrator`) REFERENCES users(`id`),
  FOREIGN KEY (`active_participant`) REFERENCES participants(`id`)
  FOREIGN KEY (`last_stolen_present`) REFERENCES presents(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
