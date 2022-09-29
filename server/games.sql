CREATE TABLE `games` (
  `id` int NOT NULL AUTO_INCREMENT,
  `administrator` int NOT NULL,
  `status` enum('setup','ready','inprogress','completed') DEFAULT 'setup',
  `rule_maxstealsperpresent` int DEFAULT NULL,
  `rule_maxstealsperround` int NOT NULL,
  `rule_firstpersonsecondchance` tinyint(1) NOT NULL,
  `rule_extraround` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
