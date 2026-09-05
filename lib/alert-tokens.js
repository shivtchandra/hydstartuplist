import { createHmac,timingSafeEqual } from 'node:crypto';
export function signAlert(id,action,secret,now=Date.now()) {
  const payload=Buffer.from(JSON.stringify({id,action,exp:now+(action==='confirm'?2:365)*86400000})).toString('base64url');
  return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}
export function verifyAlert(token,secret,now=Date.now()) {
  try {const [payload,signature]=token.split('.');const expected=createHmac('sha256',secret).update(payload).digest();const got=Buffer.from(signature,'base64url');
    if(got.length!==expected.length||!timingSafeEqual(got,expected))return null;
    const data=JSON.parse(Buffer.from(payload,'base64url').toString());
    if(data.exp<now||!['confirm','manage'].includes(data.action)||!/^([a-f0-9]{64})$/.test(data.id))return null;return data;
  }catch{return null;}
}
