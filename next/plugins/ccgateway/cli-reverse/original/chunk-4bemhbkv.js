
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{wj}from"./chunk-c8yxp647.js";class ihn{append(e){this._buffer=this._buffer?Buffer.concat([this._buffer,e]):e}readMessage(){if(!this._buffer)return null;let e=this._buffer.indexOf(`
`);if(e===-1)return null;let r=this._buffer.toString("utf8",0,e).replace(/\r$/,"");return this._buffer=this._buffer.subarray(e+1),PBo(r)}clear(){this._buffer=void 0}}function PBo(e){return wj.parse(JSON.parse(e))}function e9n(e){return JSON.stringify(e)+`
`}
export{ihn,PBo,e9n};
