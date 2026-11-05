
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{xR,Pn}from"./chunk-5ythzcas.js";import{Lr}from"./chunk-2k62t388.js";import{i}from"./chunk-xjnnz630.js";import{_t}from"./chunk-my2r02mp.js";import{Ae}from"./chunk-5m8x0kb6.js";import{yU,xWn,TR}from"./chunk-9ys74nhz.js";import{ld,Qoe,Ca}from"./chunk-exfmq47h.js";import{mn}from"./chunk-0nvx3515.js";import{kzt}from"./chunk-4ecjsaj6.js";import{Ect}from"./chunk-q1gbn2mn.js";var rBo=(o)=>o.find((m)=>m!==!1)||void 0;function d(){let{source:o}=Ca();return o==="CLAUDE_CODE_OAUTH_TOKEN"||o==="CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"}var p=()=>Ca().source==="CCR_OAUTH_TOKEN_FILE"&&xR()&&ld();var u=()=>xWn()&&!TR()&&ld()&&(d()||p());var M8n=()=>Qoe()&&!Pn()&&(yU()&&Ca().source==="CLAUDE_CODE_OAUTH_TOKEN"||u());var l=()=>Ect()||M8n();var qXs=()=>i.CLAUDE_CODE_REMOTE?"cloud-session":"signed-out";var D8n=()=>rBo([Ae()!=="firstParty"&&"third-party",Lr()&&"bare",_t()&&"traffic-off",!mn(kzt)&&"policy",!l()&&qXs()]);export{rBo,M8n,qXs,D8n};
