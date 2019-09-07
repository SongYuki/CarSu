import {
  sequelize,
  Message,
} from '../models';
import request from 'request';

import {AppKey, MasterSecret} from '../../config/jpush.json';

const Authorization = `Basic ${new Buffer(`${AppKey}:${MasterSecret}`).toString('base64')}`;

export async function sendMessage(userId, content) {
  await Message.create({
    userId,
    content,
  });

  // 发送推送通知
  request({
    url: 'https://api.jpush.cn/v3/push',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': Authorization,
    },
    body: JSON.stringify({
      "platform": "all",
      "audience": {
        "alias": [`${userId}`],
      },
      "notification": {
        "android": {
          "alert": content,
          "title": 'CarParking',
          "extras": {
          }
        },
        "ios": {
          "alert": content,
          "sound": "default",
          "badge": "+1",
          "extras": {
            "newsid": 321
          }
        }
      },
      "message": {
        "msg_content": content,
        "content_type": "text",
        "title": "CarParking",
        "extras": {
          "key": "value"
        }
      },
      "options": {
        "time_to_live": 60,
        "apns_production": true,
      },
    }),
  }, function(error, response, body) {
    if (error){
      console.error(error);
    }
    if (__DEV__){
      console.log('res', response, error, body);
    }
  });
}
