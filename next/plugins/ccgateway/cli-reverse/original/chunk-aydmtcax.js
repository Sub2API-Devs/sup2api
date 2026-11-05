
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{lK,Ut}from"./chunk-3jnp0k38.js";import{c}from"./chunk-47b8txen.js";import{t}from"./chunk-6hadbefe.js";import{cA}from"./chunk-evj8g37g.js";function BMt(e){if(!lK(e))return!1;if(Ut(e))return!0;return/^[A-Za-z0-9][A-Za-z0-9_]*$/.test(e)&&cA(e)!==void 0}function _br(e,o={}){return o.acceptCustomIds?lK(e):BMt(e)}function B9e(e,o,n={}){if(o)return{adoptedSessionId:null,effectiveFork:!0};if(e===void 0)return{adoptedSessionId:null,effectiveFork:!1};if(_br(e,n))return{adoptedSessionId:e,effectiveFork:!1};return t(`resume: transcript session id (${typeof e}) rejected by the adoption gate; continuing as a fork under the fresh session id`),c("session_resume","unadoptable_session_id"),{adoptedSessionId:null,effectiveFork:!0}}
export{BMt,_br,B9e};
