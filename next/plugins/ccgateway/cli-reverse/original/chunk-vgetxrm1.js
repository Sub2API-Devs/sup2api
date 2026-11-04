
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Xti,nni}from"./chunk-s61vbvea.js";import{dce}from"./chunk-t2adxqya.js";function SLt({sessionId:t,getAccessToken:s,fetchSession:i,initial:e,createOrigin:d}){if(!dce())return;let n=!1,r=(o)=>Xti(o,n);return nni({...e&&{initial:e.then(r)},read:()=>i(t,{accessToken:s()}).then(r)})}
export{SLt};
