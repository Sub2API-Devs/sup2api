
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{WEi,YEi}from"./chunk-7jxyna5q.js";import{xpe}from"./chunk-7hyy4kzw.js";function VBt({sessionId:t,getAccessToken:s,fetchSession:i,initial:e,createOrigin:d}){if(!xpe())return;let n=!1,r=(o)=>WEi(o,n);return YEi({...e&&{initial:e.then(r)},read:()=>i(t,{accessToken:s()}).then(r)})}
export{VBt};
