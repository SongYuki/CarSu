import { sync as createUid } from 'uid-safe';
import md5 from '../utils/md5';
import { createToken, checkTokenWithInfo } from '../utils/token';
import StatusError from '../utils/StatusError';

const LOGIN_EXPIRE_TIME = 30 * 24 * 3600 * 1000;
const ADMIN_EXPIRE_TIME = 1 * 24 * 3600 * 1000;

export function createLoginToken(uid) {
  return createToken({
    type: 'user',
    uid,
    exp: Date.now() + LOGIN_EXPIRE_TIME,
  });
}

export function checkLogined(ctx, next) {
  const token = ctx.header['x-accesstoken'];
  const session = checkTokenWithInfo(token, 'user');
  if (!session) {
    throw StatusError.UNAUTHORIZED;
  }
  ctx.session = session;
  return next();
}

export function createBuyerToken(uid) {
  return createToken({
    type: 'buyer',
    uid,
    exp: Date.now() + LOGIN_EXPIRE_TIME,
  });
}

export function checkBuyerLogined(ctx, next) {
  const token = ctx.header['x-accesstoken'];
  const session = checkTokenWithInfo(token, 'buyer');
  if (!session) {
    throw StatusError.UNAUTHORIZED;
  }
  ctx.session = session;
  return next();
}

export function createAdminToken(uid) {
  return createToken({
    type: 'admin',
    uid,
    exp: Date.now() + ADMIN_EXPIRE_TIME,
  });
}

export function checkAdminLogined(ctx, next) {
  const token = ctx.header['x-accesstoken'];
  const session = checkTokenWithInfo(token, 'admin');
  if (!session) {
    throw StatusError.UNAUTHORIZED;
  }
  ctx.session = session;
  return next();
}

export function createSecretPair(pwd) {
  const salt = createUid(16) + '==';
  const secret = md5(pwd + salt);
  return {
    salt,
    secret,
  };
}

export function checkSecretPair(pwd, { salt, secret }) {
  return secret === md5(pwd + salt);
}


