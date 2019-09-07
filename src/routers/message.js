import Router from 'koa-router';
import {checkLogined} from "../modules/user";
import * as types from "../types";
import StatusError from "../utils/StatusError";
import {
  sequelize,
  Message,
} from '../models';
import {sendMessage} from '../modules/message';

const router = new Router();
export default router;

router.get('/count', checkLogined, async ctx => {
  const {uid} = ctx.session;

  const count = await Message.count({
    where: {
      userId: uid,
      read: 0,
    },
  });
  ctx.body = {
    count,
  };
});

router.get('/unreads', checkLogined, async ctx => {
  const {uid} = ctx.session;

  const list = await Message.findAll({
    where: {
      userId: uid,
      read: 0,
    },
    attributes: [
      'id', 'content',
    ],
    order: 'id ASC',
    limit: 20,
  });

  ctx.body = {
    list: list.map(v=>v.get({plain:true})),
  }
});

router.put('/:id/read', checkLogined, types.checkParams({
  id: types.integer.required,
}), async ctx => {
  const {uid} = ctx.session;
  const {id} = ctx.params;
  await Message.update({
    read: 1,
  }, {
    where: {
      userId: uid,
      id,
    }
  });
});

router.put('/test/:uid', types.checkParams({
  uid: types.integer.required,
}), async ctx => {
  const {uid} = ctx.params;
  await sendMessage(uid, '这是一条测试消息');
});
