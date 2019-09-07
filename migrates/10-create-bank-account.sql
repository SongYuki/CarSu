CREATE TABLE `BankAccounts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `type` ENUM('bank', 'wx', 'alipay') NOT NULL,
  `account` VARCHAR(45) NOT NULL,
  `name` VARCHAR(20) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`));

ALTER TABLE `BankAccounts`
ADD INDEX `bankaccount-user-fk_idx` (`userId` ASC);
ALTER TABLE `BankAccounts`
ADD CONSTRAINT `bankaccount-user-fk`
  FOREIGN KEY (`userId`)
  REFERENCES `vcont`.`Users` (`id`)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
