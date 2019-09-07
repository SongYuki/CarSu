CREATE TABLE `Orders` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    `state` ENUM('init', 'paid', 'close') NOT NULL DEFAULT 'init' COMMENT '订单状态',
    `buyerId` INT NOT NULL COMMENT '买家ID',
    `totalPrice` DECIMAL(10, 2) NOT NULL COMMENT '订单总价',
    `seqNum` VARCHAR(24) NOT NULL COMMENT '订单序列号',
    `createdAt` DATETIME NOT NULL,
    `updatedAt` DATETIME NOT NULL,
    PRIMARY KEY (`id`)
);

CREATE TABLE `OrderItems` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `orderId` INT NOT NULL COMMENT '订单ID',
    `goodId` INT NOT NULL COMMENT '商品ID',
    `advId` INT NULL COMMENT '推广软文ID',
    `amount` INT NOT NULL COMMENT '购买数量',
    `price` DECIMAL(10,2) NOT NULL COMMENT '商品单价',
    `createdAt` DATETIME NOT NULL,
    `updatedAt` DATETIME NOT NULL,
    PRIMARY KEY (`id`)
);

ALTER TABLE `Orders`
  ADD CONSTRAINT `order_buyer_fk`
    FOREIGN KEY (`buyerId`)
    REFERENCES `Buyers` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `OrderItems`
  ADD CONSTRAINT `order_items_fk`
    FOREIGN KEY (`orderId`)
    REFERENCES `Orders` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `OrderItems`
  ADD CONSTRAINT `order_items_good_fk`
    FOREIGN KEY (`goodId`)
    REFERENCES `Goods` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `OrderItems`
  ADD CONSTRAINT `order_items_adv_fk`
    FOREIGN KEY (`advId`)
    REFERENCES `Advertises` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;