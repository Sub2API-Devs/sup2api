
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ae}from"./chunk-gcy2kcsb.js";function oGo(n){if(!ae())return;let r=/^\(dispatched #(\d+)\)$/;if(n===null||typeof n!=="object")return;let e=n;if(!("asyncDispatched"in e)||e.asyncDispatched!==!0)return;let t="evalId"in e?e.evalId:void 0;if(typeof t==="number")return t;let u="result"in e?e.result:void 0,d=typeof u==="string"?r.exec(u):null;return d===null?void 0:Number(d[1])}
export{oGo};
