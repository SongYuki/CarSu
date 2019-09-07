import StatusError from '../utils/StatusError';
import { VerifyCode } from '../models';
import {sendSMS} from './yuntongxun';

const CODE_EXPIRE_TIME = 5 * 60 * 1000;
const CODE_RESEND_INTERVAL = 60 * 1000;
const CODE_EXPIRE_NAME = '5';

function randomCode() {
  if (__DEV__){
    return '123456';
  }
  return (('000000' + Math.floor(Math.random() * 1000000)).slice(-6));
}

export async function sendCode(ctx) {
  const { mobile } = ctx.request.body;

  const code = randomCode();

  // 检查1分钟内是否发送过验证码
  const obj = await VerifyCode.findOne({
    where: {
      mobile,
      expire: {
        $gt: new Date(Date.now() + CODE_EXPIRE_TIME - CODE_RESEND_INTERVAL ),
      },
    },
    attributes : [ 'mobile', 'code'],
  });

  if (obj) {
    // 忽视错误,不发送验证码.
    ctx.body = {
      ok: 1,
    };
    return;
  }

  // 保存验证码到数据库
  await VerifyCode.upsert({
    mobile,
    code,
    expire: new Date(Date.now() + CODE_EXPIRE_TIME),
  });

  if (!__DEV__) {
    sendSMS(mobile, code, CODE_EXPIRE_NAME);
  }

  ctx.body = {
    ok: 1,
  };
}

export async function verifyCode(mobile, code) {
  const obj = await VerifyCode.findOne({
    where: {
      mobile,
      expire: {
        $gt: new Date(),
      },
    },
    attributes: ['id', 'mobile', 'code'],
  });

  if (!obj) {
    throw new StatusError(403, 'Resend needed.');
  }

  if (obj.code !== code) {
    throw new StatusError(404, 'Code mismatch');
  }

  await obj.destroy();
}
