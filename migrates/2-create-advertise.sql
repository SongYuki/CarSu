CREATE TABLE `Advertises` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '创作Id',
  `type` VARCHAR(16) COMMENT '创作类型',
  `goodsid` INT NOT NULL COMMENT '本地商品Id',
  `advid` INT NULL COMMENT '店商品Id',
  `userid` INT NOT NULL COMMENT '创建人Id',
  `content` VARCHAR(255) NOT NULL COMMENT '内容',
  `soldnum` INT DEFAULT 0 COMMENT '售出数量',
  `income` DECIMAL(10,2) DEFAULT 0 COMMENT '金额',
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`)
);