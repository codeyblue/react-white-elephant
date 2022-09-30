CREATE TABLE `games` (
  `id` int AUTO_INCREMENT,
  `administrator` int NOT NULL,
  `status` enum('setup','ready','inprogress','completed') DEFAULT 'setup',
  `active_chooser` int DEFAULT NULL,
  `rule_maxstealsperpresent` int DEFAULT 3,
  `rule_maxstealsperround` int DEFAULT -1,
  `rule_firstpersonsecondchance` bool DEFAULT true,
  `rule_extraround` bool DEFAULT true,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`administrator`) REFERENCES users(`id`),
  FOREIGN KEY (`active_chooser`) REFERENCES participants(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
