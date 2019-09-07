import Router from 'koa-router';
import * as types from '../../types';
import moment from 'moment';

import {
  User,
  Buyer,
  Order,
  Good,
  OrderItem,
  Advertise,
  Address,
  sequelize,
} from '../../models';
import {checkBuyerLogined} from "../../modules/user";

import {getWxLoginInfo, getWxOrder, getWxPayInfo} from "../../modules/wechat";
import {getDownloadUrl} from '../../modules/stores';
import {getDistrictCode} from "../../utils/common";

import rp from 'request-promise';

const router = new Router();
export default router;

let lastDate = '';
let lastSeq = 0;
function getSeqNum(date){
  if (lastDate !== date) {
    lastDate = date;
    lastSeq = 1;
  }
  if (lastSeq < 100) {
    return ('00'+lastSeq).substr(-2);
  }
  return `${lastSeq}`;
}

function generateSeqNum(){
  const now = new Date();
  const year = ('0000'+(now.getYear()+1900)).substr(-4);
  const month = ('00'+(now.getMonth()+1)).substr(-2);
  const date = ('00'+now.getDate()).substr(-2);
  const seq = getSeqNum(`${year}${month}${date}`);
  const ran = ('000'+Math.floor(Math.random()*1000)).substr(-3);
  return `${year}${month}${date}${seq}${ran}`
}

router.post('/create', checkBuyerLogined, types.checkBody({
  items: types.arrayOf(types.shapeOf({
    goodId: types.integer.required,
    amount: types.integer.required,
    advId: types.integer,
  })),
  addressId: types.integer.required,
}), async ctx => {
  const {uid:buyerId} = ctx.session;
  const {items, addressId} = ctx.request.body;
  const seqNum = generateSeqNum();
  let totalPrice = 0;
  for (let item of items) {
    const itemInfo = await Good.findById(item.goodId, {
      attributes: ['id', 'price'],
    });
    item.price = itemInfo.price;
    totalPrice += item.price * item.amount;
  }
  const address = await Address.findById(addressId, {
    attributes: [
      'name', 'mobile', 'postCode', 'province', 'city',
      'area', 'address',
    ],
  });
  await sequelize.transaction(async transaction => {
    const order = await Order.create({
      buyerId,
      totalPrice,
      seqNum,
      ...address.get({plain:true}),
    }, {transaction});
    const orderId = order.id;
    for (let item of items) {
      await OrderItem.create({
        orderId,
        ...item,
      }, {transaction});
    }
    ctx.result = order.id;
  });
});

router.get('/list', checkBuyerLogined, types.checkQuery({
  page: types.integer,
  pageSize: types.integer,
}), async ctx => {
  const {uid:buyerId} = ctx.session;
  const {page=0, pageSize=20} = ctx.query;
  const orders = await Order.findAll({
    where: {buyerId},
    attributes: ['id', 'state', 'totalPrice', 'seqNum'],
    include: [
      {
        model: OrderItem,
        as: 'items',
        attributes: ['id'],
        include:[
          {
            model: Good,
            as: 'good',
            attributes:['id', 'name', 'cover', 'property']
          }
        ]
      }
    ]
  });
  ctx.result = orders.map(v=>v.get({plain:true}));
});

router.get('/:id/expressInfo', checkBuyerLogined, async ctx => {

  const {uid:buyerId} = ctx.session;
  const id = parseInt(ctx.params.id);
  
  const order = await Order.findById(id, {
    where: {buyerId},
    attributes:['id', 'expressCode', 'state'],
    include:[
      {
        model: OrderItem,
        as: 'items',
        attributes: ['id'],
        include:[
          {
            model:Good,
            as: 'good',
            attributes:['id', 'cover']
          }
        ]
      }
    ]
  });

  var expressCode = order.expressCode;
  var cover = order.items[0].good.cover;

  var requestUrl = "http://jisukdcx.market.alicloudapi.com/express/query?" + "number=" + expressCode + "&type=auto";
  var ret = await rp({
    uri:requestUrl,
    headers:{
      Authorization:"APPCODE d8987041fef34ccaa0dce361bf475b55"
    },
    json:true
  });

  console.log(ret);
  ctx.result = {
    expressCode:order.expressCode,
    state:order.state,
    expressInfo:ret,
    cover:cover
  }

})

router.get('/:id/detail', checkBuyerLogined, async ctx => {
  const {uid:buyerId} = ctx.session;
  const {id} = ctx.params;

  const order = await Order.findById(id, {
    where: {buyerId},
    attributes: ['id', 'state', 'totalPrice', 'seqNum'],
    include: [
      {
        model: OrderItem,
        as: 'items',
        attributes: ['id', 'amount', 'price'],
        include: [
          {
            model: Good,
            as: 'good',
            attributes: ['id', 'name', 'cover'],
          },
          {
            model: Advertise,
            as: 'adv',
            attributes: ['id'],
            include: [
              {
                model: User,
                as: 'author',
                attributes: ['id', 'name'],
              },
            ],
          }
        ],
      },
    ],
  });
  ctx.result = order.get({plain:true});
  ctx.result.items.forEach(v=>{
    if (v.good.cover) {
      v.good.coverUrl = getDownloadUrl(v.good.cover);
    }
  })
});

router.get('/getwxorder/:id', checkBuyerLogined, types.checkParams({
  id:types.number.required
}), async ctx => {

  var id = parseInt(ctx.params.id);
  var {uid:buyerId} = ctx.session;


  //获取订单信息
  var order = await Order.findById(id, {
    where: {buyerId},
    attributes:['id', 'totalPrice', 'seqNum'],
    include:[
      {
        model:OrderItem,
        as: 'items', 
        attributes: ['id', 'amount', 'price'],
        include:[
          {
            model:Good,
            as:'good',
            attributes:['id', 'name']
          }
        ]
      }
    ]
  })

  order = order.get({plain:true});
  //获取用户信息
  var buyer = await Buyer.findById(buyerId, {
    attributes:['openId']
  });
  buyer = buyer.get({plain:true});

  var ret = await getWxOrder({
    order:order,
    me:buyer
  });

  if (ret.return_code === "FAIL"){
    ctx.result = ret;
  }else{
    //保留ret.prepay_id;

    await Order.update({
      prepayid:ret.prepay_id
    },{
      where:{
        id:id,
        buyerId:buyerId
      }
    })

    ctx.result = ret;
  }  
});

router.post("/getwxpaysign", checkBuyerLogined, types.checkBody({

}), async ctx=>{

  var ret = getWxPayInfo({
    prepayid:ctx.request.body.prepayid,
    noncestr:ctx.request.body.noncestr,
    timestamp:ctx.request.body.timestamp
  });

  ctx.result = ret;

})

router.post('/payret', async ctx=>{

  if (ctx.request.body.result_code === 'SUCCESS'){
    //支付成功
    var {openid, out_trade_no, transaction_id} = ctx.request.body;

    //修改订单状态
    var ret = await Order.update({
      state:'paid'
    }, {
      where:{
        id:out_trade_no,
      }
    });
    
  }else{
    //支付失败
  }

})

router.post('/ordersfromstartdate', types.checkBody({

}), async ctx => {

  var {startDate, numRecords} = ctx.request.body;

  var orderInfo = await Order.findAll({
    order:'updatedAt ASC',
    where:{
      createdAt:{
        $gt:startDate
      }
    },
    limit:numRecords,
    include:[
      {
        model:OrderItem,
        as: 'items', 
        attributes: ['id', 'amount', 'price'],
        include:[
          {
            model: Good,
            as: 'good',
            attributes:['id', 'name', 'price', 'cover', 'property']
          }
        ]
      }
    ]
  });

  orderInfo = orderInfo.map(v=>v.get({plain:true}));

  var ret = [];
  orderInfo.map(v=>{

    //根据市和区查找districtCode
    var disCode = getDistrictCode(v.province, v.city, v.area);
    var createdAt = v.createdAt;
    var updatedAt = v.updatedAt;

    ret.push({
      orderId:v.id,
      parentId:null,    
      userId:v.buyerId,
      channelId:"XUNI_53",
      storeId:null,
      supplierId:null,
      orderType:101,
      orderAmount:v.totalPrice,
      amount:(v.state==='init'?0:v.totalPrice),
      shippingMethod:101,
      paymentMethod:null,
      shippingfee:0,
      quantity:v.items.length,
      invoiceType:"",
      invoiceTitle:"",
      invoiceContent:"",
      comments:null,
      status:v.state==='init'?101:(v.state==='paid'?104:(v.state==='sent'?108:109)),
      paymentStatus:v.state==='init'?1:2,
      version:null,
      createdOn:moment(v.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      updatedOn:moment(v.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
      finishedOn:null,
      userName:null,
      nickname:null,
      consignee:v.name,
      districtCode: disCode,
      address:v.province + v.city + v.area + v.address,
      mobilePhone: v.mobile,
      postCode: v.postCode,
      telephone: v.mobile,
      email: null,
      items:v.items.map(i=>{
        return {
          itemId:i.good.id,
          productName:i.good.name,
          quantity:i.amount,
          given:0,
          listPrice:i.good.price,
          price:i.good.price,
          favorableAmount:0,
          status:1,
          sku:null
        }
      })
    })
  })
  
  ctx.body = {
    code:200,
    error:null,
    orders:ret
  }

})

router.post('/orderexpress', async ctx => {

  var updateInfo = ctx.request.body;

  updateInfo.map(async v=>{
    var {expressCode, expressName, trackTime, remarks, orderId} = v;

    await Order.update({
      expressCode, trackTime, remarks, expressName
    }, {
      where:{
        id:orderId
      }
    })
  });

  ctx.body = {
    code:200,
    error:null
  }

})
