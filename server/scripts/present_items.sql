CREATE TABLE `present_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `present_key` int NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `hyperlink` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY `present_key` (`present_key`) REFERENCES `presents` (`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
