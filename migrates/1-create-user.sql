CREATE TABLE `Users` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `mobile` VARCHAR(11) NOT NULL COMMENT '手机号',
  `name` VARCHAR(45) NOT NULL COMMENT '用户昵称\n',
  `avatar` VARCHAR(60) NULL COMMENT '用户头像',
  `salt` VARCHAR(24) NOT NULL COMMENT '密码盐',
  `secret` VARCHAR(24) NOT NULL COMMENT 'MD5(MD5(密码)+密码盐)',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `mobile_UNIQUE` (`mobile` ASC)
);
