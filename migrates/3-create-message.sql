CREATE TABLE `Messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userid` INT,
  `type` VARCHAR(32),
  `content` VARCHAR(255),
  `info` VARCHAR(255) COMMENT '其它信息,JSON',
  `read` INT COMMENT '未读：0 已读： 1',
  `createdAt` DATETIME,
  `updatedAt` DATETIME,  
  PRIMARY KEY (`id`)
);
