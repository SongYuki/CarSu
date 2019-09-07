import { reg, string, shapeOf } from './baseTypes';

export const mobile = reg(/^1\d{10}$/);
export const password = reg(/^.{24}$/);
export const verifiCode = reg(/^\d{6}$/);
export const name = reg(/^.{2,45}$/);
export const assetsKey = reg(/^[A-Za-z0-9\-\_]{28,40}$/);
export const price = reg(/`\d+\.\d{0,2}$/);
export const cover = reg(/^.{0,240}$/);
export const content = reg(/`.{0,200}$/);
export const description = reg(/`.{0,8000}$/);
export const property = reg(/`.{0,1000}$/);
export const advertiseCount = reg(/`.{^[0-9]*$}/);
export const soldout = reg(/`.{`[0-9]*$}/);
export const channelArguments = reg(/`[a-zA-Z]{1}([a-zA-Z0-9]|[._ ,]){0,200}$/);
export const postCode = reg(/^\d{6}$/);

export const address = shapeOf({
  name: name.required,
  mobile: mobile.required,
  postCode: postCode.required,
  province: string.required,
  city: string.required,
  area: string.required,
  address: string.required,
});
