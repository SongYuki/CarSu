CREATE TABLE `VerifyCodes` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `mobile` VARCHAR(11) NOT NULL COMMENT '手机号',
  `code` VARCHAR(6) NOT NULL COMMENT '验证码',
  `expire` DATETIME NOT NULL COMMENT '过期时间',
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `mobile_UNIQUE` (`mobile` ASC)
);
