CREATE TABLE `presents` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'primary key',
  `gifter` varchar(255) NOT NULL COMMENT 'person who brought gift',
  `status` enum('wrapped','open', 'locked') DEFAULT 'wrapped' COMMENT 'status of the present either wrapped, open, or locked',
  `holder` int COMMENT 'user id of person currently holding the present',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
