
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Fd}from"./chunk-f4c4vzny.js";function uq(r){try{let t=r;if(t===null||typeof t!=="object"&&typeof t!=="function")return!1;for(let e=0;e<64;e++){if(Fd(t))return!1;let o=Reflect.getPrototypeOf(t);if(o===null)return!1;if(o===Error.prototype)return!0;t=o}return!1}catch{return!1}}function z_s(r,t){try{return t.toStr(r)}catch{return t.errMsg(r)}}
export{uq,z_s};
