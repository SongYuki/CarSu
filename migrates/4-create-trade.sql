CREATE TABLE `Trades` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('income', 'draw') NOT NULL,
  `userid` INT,
  `advid` INT,
  `amount` DECIMAL(10,2),
  `createdAt` DATETIME,
  `updatedAt` DATETIME,  
  PRIMARY KEY (`id`)
);
