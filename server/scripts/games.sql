CREATE TABLE `games` (
  `id` int AUTO_INCREMENT,
  `administrator` int NOT NULL,
  `status` enum('setup','ready','inprogress','final_round','complete') DEFAULT 'setup',
  `round` int DEFAULT NULL,
  `active_participant` int DEFAULT NULL,
  `rule_maxstealsperpresent` int DEFAULT 3,
  `rule_maxstealsperround` int DEFAULT -1,
  `rule_firstpersonsecondchance` bool DEFAULT true,
  `rule_extraround` bool DEFAULT true,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`administrator`) REFERENCES users(`id`),
  FOREIGN KEY (`active_participant`) REFERENCES participants(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
