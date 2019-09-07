import Router from 'koa-router';
import {
  User,
  sequelize,
  Advertise,
} from '../models';
import {
  checkLogined,
  createLoginToken,
  createSecretPair,
  checkSecretPair,
} from '../modules/user';
import * as types from '../types';
import StatusError from "../utils/StatusError";
import { sendCode, verifyCode } from '../modules/mobile';
import objectFilter from 'just-filter';
import { getDownloadUrl } from '../modules/stores';

const router = new Router();
export default router;

router.post('/login', types.checkBody({
  mobile: types.mobile.required,
  pwd: types.password.required,
}), async ctx => {
  const { mobile, pwd } = ctx.request.body;
  const user = await User.findOne({
    where: { mobile },
    attributes: ['id', 'salt', 'secret'],
  });
  if (user === null || !checkSecretPair(pwd, user)) {
    throw StatusError.FORBIDDEN;
  }
  ctx.body = {
    ok: 1,
    uid: user.id,
    token: createLoginToken(user.id),
  };
});

router.put('/me',checkLogined,types.checkBody({
  avatar:types.assetsKey,
}),async ctx => {
  const { uid } = ctx.session;
  const { avatar, birthday, sex } = ctx.request.body;
  await User.update(
    objectFilter({
      avatar, sex,
      birthday: birthday && new Date(birthday),
    }, (k,v) => v !== undefined),
    { where: { id: uid } }
  );
  ctx.body = {
    ok:1,
  };
});

router.get('/me',checkLogined,async(ctx) => {
  const {uid} = ctx.session;
  const user = await User.findById(uid,{
    attributes:[
      'id','name','mobile','avatar', 'paySecret', 'salary', 'earned',
      'birthday', 'sex',
    ],
  });
  const info = user.get({plain:true});
  info.avatarUrl = getDownloadUrl(info.avatar, {
    mode: 1,
    w: 480,
    h: 480,
  });
  info.avatarUrl240 = getDownloadUrl(info.avatar, {
    mode: 1,
    w: 240,
    h: 240,
  });
  info.paySecret = !!info.paySecret;
  info.birthday = info.birthday && info.birthday.getTime(),
  info.rank = 1 + await User.count({
    where: {
      earned: {$gt: info.earned},
    },
  });
  info.adCount = await Advertise.count({
    where: {
      authorId: uid,
      deleted: 0,
    },
  });

  ctx.body = info;
})

router.post('/pwd/change',checkLogined,types.checkBody({
  oldPwd:types.password.required,
  pwd:types.password.required,
}),async ctx => {
  const {uid} = ctx.session;
  const {pwd,oldPwd} = ctx.request.body;
  const user = await User.findById(uid,{
    attributes:['id','salt','secret'],
  });
  if(!checkSecretPair(oldPwd,user)){
    throw StatusError.FORBIDDEN;
  }
  const {salt,secret} = createSecretPair(pwd);
  await user.update({
    salt,
    secret,
  });
});

router.post('/pwd/reset',types.checkBody({
  mobile:types.mobile.required,
  pwd:types.password.required,
  verifiCode:types.verifiCode.required,
}),async ctx =>{
  const { mobile, pwd, verifiCode } = ctx.request.body;
  await verifyCode(mobile, verifiCode);
  const user = await User.findOne({
    where:{mobile},
    attributes:['id','mobile'],
  });
  if(!user){
    throw StatusError.NOT_FOUND;
  }
  const {salt,secret} = createSecretPair(pwd);
  await user.update({
    salt,
    secret,
  });
});

router.post('/payPwd/reset', checkLogined, types.checkBody({
  verifiCode: types.verifiCode,
  payPwd: types.password.required,
}), async ctx => {
  const { verifiCode, payPwd } = ctx.request.body;
  const {uid} = ctx.session;
  const user = await User.findById(uid,{
    attributes:[
      'id', 'mobile', 'paySecret',
    ],
  });
  if (!user) {
    throw StatusError.UNAUTHORIZED;
  }
  if (user.paySecret) {
    // 不是第一次设置密码
    await verifyCode(user.mobile, verifiCode);
  }
  const {salt,secret} = createSecretPair(payPwd);
  await user.update({
    paySalt: salt,
    paySecret: secret,
  });
});

router.post('/register',types.checkBody({
  mobile:types.mobile.required,
  pwd:types.password.required,
  name: types.name.required,
  verifiCode: types.verifiCode.required,
}),async ctx => {
  try {
    const { mobile, name, pwd, verifiCode } = ctx.request.body;
    await verifyCode(mobile, verifiCode);
    const {salt, secret} = createSecretPair(pwd);
    const user = await User.create({name, mobile, salt, secret});

    ctx.body = {
      ok: 1,
      uid: user.id,
      token: createLoginToken(user.id),
    };
  } catch (err){
    if (err instanceof sequelize.UniqueConstraintError && err.fields.mobile_UNIQUE) {
      throw StatusError.CONFLICT;
    }
    throw err;
  }
});

router.post('/sendCode', types.checkBody({
  mobile:types.mobile.required,
}), sendCode);
