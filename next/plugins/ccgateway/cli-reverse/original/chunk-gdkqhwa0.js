
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ae}from"./chunk-5m8x0kb6.js";import{lCr,Ka,Hn}from"./chunk-exfmq47h.js";var r=86400000,n=3*r;function tqn(){if(Ae()!=="firstParty"||!Ka())return null;let e=Hn();if(!e?.refreshToken||!lCr(e.refreshTokenExpiresAt))return null;let t=e.refreshTokenExpiresAt;if(typeof e.expiresAt==="number"&&e.expiresAt>t+n)return null;return new Date(t)}function njt(){let e=tqn();if(e===null)return null;let t=e.getTime()-Date.now();if(t>n||t<=0)return null;return{daysLeft:Math.ceil(t/r)}}
export{tqn,njt};
