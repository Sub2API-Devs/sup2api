
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{xet,TRe}from"./chunk-5ythzcas.js";import{Rfe,Evo,vvo}from"./chunk-m1f5npav.js";function s(){return Evo({envVar:"CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",wellKnownPath:Rfe,readPath:process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE??Rfe,label:"token",fileLabel:"session ingress token",getCached:xet,setCached:TRe,skipInReviewOrigin:!0})}async function h5i(e){if(process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN)return;await vvo({envVar:"CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",wellKnownPath:Rfe,readPath:process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE??Rfe,label:"token",fileLabel:"session ingress token",getCached:xet,setCached:TRe,credentials:e,skipInReviewOrigin:!0})}function dc(){let e=process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;if(e)return e;return s()}function gKe(){return dc()!==null}function pG(){let e=dc();if(!e)return{};if(e.startsWith("sk-ant-sid")){let n={Cookie:`sessionKey=${e}`},r=process.env.CLAUDE_CODE_ORGANIZATION_UUID;if(r)n["X-Organization-Uuid"]=r;return n}return Y0e(e)}function Y0e(e){return e?{Authorization:`Bearer ${e}`}:{}}function lMr(e){process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN=e}
export{h5i,dc,gKe,pG,Y0e,lMr};
