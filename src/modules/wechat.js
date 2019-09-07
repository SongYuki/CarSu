let wechatConfig = require('../../config/weixin.json');
let appId = wechatConfig.appId;
let appSecret = wechatConfig.appSecret;
let mchId = wechatConfig.mchId;
let mchKey = wechatConfig.mchKey;

import rp from 'request-promise';
import md5 from 'md5';
import StatusError from "../utils/StatusError";
import xmlParser from 'basic-xml2json';

function tranlateError(code) {
  switch (code) {
    case 40003:
      throw new StatusError(403, '您必须先关注本公众号');
    case 40029:
      throw StatusError.BAD_REQUEST;
    default:
      throw StatusError.SERVER_INTERNAL;
  }
}

function randomStr(len){
  return md5(new Date()).substring(0, len);
}

function wxSign(info){
  var str = "";

  Object.keys(info).map((k) => {
    str += (k + "=" + info[k] + "&");
  });
  str += ("key=" + mchKey);

  console.log(str);

  var sign = md5(str).toUpperCase();

  return sign;
}

export function getWxPayInfo(info){
  var info = {
    "appId":appId,
    "nonceStr":info.noncestr,
    "package":"prepay_id=" + info.prepayid,
    "signType":"MD5",
    "timeStamp":info.timestamp
  }

  var sign = wxSign(info);
  return sign;
}

export async function getWxLoginInfo(code){

  let baseURL = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + appId + 
                "&secret=" + appSecret + 
                "&code=" + code + "&grant_type=authorization_code";

  var ret = await rp({
    uri:baseURL,
    json:true
  });

  if (ret.errcode){
    throw tranlateError(ret.errcode);
  }else{
    return {
      openId:ret.openid,
      accessToken:ret.access_token
    }
  }
}

export async function getWxOrder(myOrderInfo){

  //Test:
  var ipInfo = "220.184.84.126";

  //组装数据
  var wxOrderInfo = {
    appid:appId,
    body:"支付测试",
    detail:JSON.stringify({
      goods_detail:myOrderInfo.order.items.map(v=>{
        return {
          goods_id:v.good.id,
          goods_name:v.good.name,
          quantity:v.amount,
          price:parseInt(v.price*100)
        }
      })
    }),
    mch_id:mchId,
    nonce_str:randomStr(16),
    notify_url:'http://m.vcont.com/shop/order/payret',
    openid:myOrderInfo.me.openId,
    out_trade_no:myOrderInfo.order.id,
    spbill_create_ip:ipInfo,
    total_fee:1,//parseInt(myOrderInfo.order.totalPrice*100),
    trade_type:'JSAPI'
  }

  var sign = wxSign(wxOrderInfo);
  wxOrderInfo.sign = sign;

  //转为xml
  var XMLret = "<xml>";
  Object.keys(wxOrderInfo).map(k=>{
    if (k === 'detail'){
      XMLret += "<" + k + ">" + "<![CDATA[" + wxOrderInfo[k] + "]]>" + "</" + k + ">";
    }else{
      XMLret += "<" + k + ">" + wxOrderInfo[k] + "</" + k + ">";
    }
  });
  XMLret += "</xml>";
  //向微信发送请求
  
  var ret = await rp({
    uri:"https://api.mch.weixin.qq.com/pay/unifiedorder",
    method:'POST',
    header:{
      "Content-Type":"application/xml"
    },
    body:XMLret
  });

  var jsonret = xmlParser.parse(ret);  

  //整理Json，这个xmlParser很难用
  var finaljson = {};
  jsonret.root.children.map(v=>{
    finaljson[v.name] = v.content;
  });

  return finaljson;

  //var ret = await postByXML ('/wxpay/pay/unifiedorder', wxOrderInfo);

}
