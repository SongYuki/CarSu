import KoaRouter from 'koa-router';
import URI from 'urijs';
import request from 'request-promise';

import * as types from '../types';
import {
  sequelize,
  Good,
  Advertise,
  Sold,
  User,
  Finance,
} from '../models';

import {
  checkLogined,
} from '../modules/user';

import weidianConfig from '../../config/weidian.json';

import { createWeidianGoods } from '../modules/weidian';
import StatusError from "../utils/StatusError";
import {getDownloadUrl} from "../modules/stores";
import {sendMessage} from '../modules/message';

const advRouter = new KoaRouter();
export default advRouter;

const qrCache = {};

async function generateQrCode(data){
  if (qrCache[data]) {
    return qrCache[data];
  }
  const url = new URI('http://api.wwei.cn/wwei.html').query({
    apikey: '20160907115228',
    data,
    logo: getDownloadUrl('logo2.png'),
  }).toString();
  const resp = await request.get({
    url,
    json: true,
  }).catch(err=>{
    console.error(url);
    console.error(err.stack);
    throw err;
  });
  if (resp.status !== 1) {
    throw new Error('Network request failed.');
  }
  return qrCache[data] = resp.data.qr_filepath;
}

advRouter.post('/create', checkLogined, types.checkBody({
  goodId: types.integer,
}), async ctx=>{
  const {uid} = ctx.session;
  const {goodId} = ctx.request.body;

  var good = await Good.findOne({
    where:{id: goodId},
    attributes: ['id', 'price', 'name', 'channelType', 'channelArguments'],
  });

  if (!good){
    throw StatusError.NOT_FOUND;
  }

  const weidianCid = await createWeidianGoods(good);

  const buyLink = `http://weidian.com/i/${weidianCid}`;

  const qrcode = await generateQrCode(buyLink);

  await sequelize.transaction(async transaction => {
    await good.increment({
      advertiseCount: 1,
    });
    await Advertise.create({
      type:"normal",
      goodId: goodId,
      authorId: uid,
      channelType: 'weidian',
      channelId: weidianCid,
      buyLink,
    }, {
      transaction,
    });
  });

  ctx.body = {
    buyLink,
    qrcode,
  }
});

advRouter.delete('/:advId', checkLogined, types.checkParams({
  advId: types.integer,
}), async ctx => {
  const { uid } = ctx.session;
  const { advId } = ctx.params;

  const adv = await Advertise.findById(advId, {
    attributes: ['id', 'images', 'url', 'authorId'],
  });

  await adv.update({
    deleted: 1,
  });
});

advRouter.put('/:advId', checkLogined, types.checkParams({
  advId: types.integer,
}), types.checkBody({
  images: types.arrayOf(types.assetsKey),
  url: types.string,
}), async ctx => {
  const {uid} = ctx.session;
  const { advId } = ctx.params;
  const { images, url } = ctx.request.body;

  if ((images && url) || (!images && !url)) {
    throw StatusError.BAD_REQUEST;
  }

  await sequelize.transaction(async transaction => {
    const adv = await Advertise.findById(advId, {
      transaction,
      attributes: ['id', 'images', 'url', 'authorId'],
    });

    if (!adv) {
      throw StatusError.NOT_FOUND;
    }

    if (adv.authorId !== uid) {
      throw StatusError.FORBIDDEN;
    }

    if (adv.images || adv.url) {
      throw StatusError.CONFLICT;
    }
    if (images) {
      await adv.update({
        images: images.join(','),
      }, { transaction });
    } else if (url) {
      await adv.update({
        url: url,
      }, { transaction });
    }
  });
});

advRouter.get('/mylist', checkLogined, types.checkQuery({
  page: types.integer,
}), async ctx => {
  const {uid} = ctx.session;
  const {page=0, uploaded} = ctx.query;

  const condition = {
    deleted: 0,
    authorId: uid,
  };
  if (uploaded) {
    condition['$or'] = [
      {
        images: {$ne: null},
      },
      {
        url: {$ne: null},
      },
    ];
  }
  var ret = await Advertise.findAll({
    attributes: ['id', 'buyLink', 'images', 'url', 'soldout', 'income'],
    where: condition,
    order: 'id DESC',
    limit: 20,
    offset: page * 20,
    include: [
      {
        model: Good,
        as: 'good',
        attributes: ['id', 'name', 'price', 'cover',],
      },
    ],
  });

  ctx.body = {
    data: await Promise.all(ret.map(async v=>{
      const ret = v.get({plain:true});
      ret.qrcode = await generateQrCode(ret.buyLink);

      if (ret.images) {
        ret.imageUrls = ret.images.split(',').map(v=>getDownloadUrl(v, {
          mode: 2,
          w: 750,
          h: 1336,
        }));
      }
      ret.good.coverUrl = getDownloadUrl(ret.good.cover);
      return ret;
    })),
  };
});

advRouter.get('/bestadv/:goodsid', checkLogined, types.checkParams({
  goodsid: types.integer,
}), async ctx => {

  var ret = await Advertise.findOne({
    attributes:['soldnum', 'income'],
    where:{goodsid:ctx.params.goodsid},
    order:'income DESC',
  });
  ctx.body = {
    data:ret?ret.map(v=>v.get({plain:true})):null
  }
});

async function processWeidianPush(ctx) {
  const { weidianParams } = ctx;
  console.log('WeiDian Message: ', JSON.stringify(weidianParams));
  if (weidianParams.type === 'weidian.order.already_payment') {
    const { message } = weidianParams;
    const { order_id, items } = message;

    await Promise.all(items.map(async (item, i) => {
      const { item_id, quantity, total_price } = item;


      await sequelize.transaction(async transaction => {
        const advertise = await Advertise.findOne({
          where: {
            channelType: 'weidian',
            channelId: item_id,
          },
          include: [
            {
              model: User,
              as: 'author',
            },
            {
              model: Good,
              as: 'good',
            }
          ],
          attributes: [ 'id', 'soldout' ],
          transaction,
        })

        // 检查是否已经记录。
        let sold = await Sold.findOne({
          where: {
            type: 'weidian',
            seq: `${order_id}-${i}`,
          },
        }, {
          transaction,
          attributes: ['id'],
        });

        if (sold) {
          return;
        }

        const {good} = advertise;

        const extract = good.extracts == null ? good.price/10 : good.extracts;
        const award = Math.floor(extract * quantity * 100) / 100;   // 获取十分之一价格,精确到分。

        // 添加记录
        sold = await Sold.create({
          type: 'weidian',
          seq: `${order_id}-${i}`,
          goodId: advertise.good.id,
          authorId: advertise.author.id,
          advertiseId: advertise.id,
          fee: total_price,
          award: award,
        }, {
          transaction,
        });

        // 给推广者发放奖励
        await advertise.author.increment({
          salary: award,
          earned: award,
        }, {
          transaction,
        });

        // 记录流水
        await Finance.create({
          userId: advertise.author.id,
          type: 'sold',
          value: award,
          soldId: sold.id,
        }, {
          transaction,
        });

        // 给物品添加销售记录
        await good.increment({
          soldout: 1,
        }, {
          transaction,
        });

        // 给这条创作增加记录
        await advertise.increment({
          soldout: 1,
          income: award,
        }, {
          transaction,
        });

        // 看看是否需要给创作者发送消息
        const soldout = advertise.soldout + 1;
        if (soldout === 1) {
          // 发送第一条消息
          sendMessage(advertise.author.id, `恭喜打下开门红！您的神作成功售出了第1件商品，有一就有二，马上就是财源滚滚的节奏啦。`);
        } else if (soldout === 10) {
          // 售出第10件商品
          sendMessage(advertise.author.id, `您的神作成功售出10件商品啦！积少成多，小金库都是攒出来的，继续加油吧。`);
        } else if (soldout < 100 && soldout%10 === 0) {
          // 发送每10个一条消息
          sendMessage(advertise.author.id, `您的神作又成功售出10件商品啦。盆满钵满了别忘请自己吃大餐！`);
        } else if (soldout === 100) {
          // 第100条
          sendMessage(advertise.author.id, `您的神作成功售出100件商品啦！听,那是毛爷爷飞入你账户的声音！`);
        } else if (soldout % 100 === 0) {
          // 发送每100个一条消息
          sendMessage(advertise.author.id, `您的神作又成功售出100件商品。小金库存了多少了？还不赶紧数钱去！`);
        }
      });
    }));
  }

  ctx.body = {
    ok: 1,
  };
}

advRouter.get('/push/weidian/:pwd', async ctx => {
  if (ctx.params.pwd !== weidianConfig.pushPassword ) {
    throw StatusError.FORBIDDEN;
  }
  ctx.weidianParams = JSON.parse(ctx.request.query.content);
  await processWeidianPush(ctx);
});

advRouter.post('/push/weidian/:pwd', async ctx => {
  if (ctx.params.pwd !== weidianConfig.pushPassword ) {
    throw StatusError.FORBIDDEN;
  }
  ctx.weidianParams = JSON.parse(ctx.request.body.content);
  await processWeidianPush(ctx);
});
