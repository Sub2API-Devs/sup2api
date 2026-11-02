
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{D9e,_ke}from"./chunk-ndmse9kj.js";import{sde,_lo,blo}from"./chunk-hvpfdswb.js";function s(){return _lo({envVar:"CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",wellKnownPath:sde,readPath:process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE??sde,label:"token",fileLabel:"session ingress token",getCached:D9e,setCached:_ke,skipInReviewOrigin:!0})}async function NIi(e){if(process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN)return;await blo({envVar:"CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",wellKnownPath:sde,readPath:process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE??sde,label:"token",fileLabel:"session ingress token",getCached:D9e,setCached:_ke,credentials:e,skipInReviewOrigin:!0})}function Hd(){let e=process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;if(e)return e;return s()}function G1e(){return Hd()!==null}function Ej(){let e=Hd();if(!e)return{};if(e.startsWith("sk-ant-sid")){let n={Cookie:`sessionKey=${e}`},r=process.env.CLAUDE_CODE_ORGANIZATION_UUID;if(r)n["X-Organization-Uuid"]=r;return n}return uMe(e)}function uMe(e){return e?{Authorization:`Bearer ${e}`}:{}}function mSr(e){process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN=e}
export{NIi,Hd,G1e,Ej,uMe,mSr};
