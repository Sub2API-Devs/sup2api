
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{EC,On}from"./chunk-ndmse9kj.js";import{vr}from"./chunk-cgcrer2m.js";import{i}from"./chunk-jhrww53q.js";import{_t}from"./chunk-bbtre4r8.js";import{Te}from"./chunk-v9tcvh08.js";import{L$,NDn,Qx}from"./chunk-7dqf31r1.js";import{Pl,sne,ua}from"./chunk-aepeg2w5.js";import{dn}from"./chunk-55ht3bcx.js";import{K$t}from"./chunk-27k1q7mc.js";import{Jrt}from"./chunk-f9asxqh1.js";var wAo=(o)=>o.find((m)=>m!==!1)||void 0;function d(){let{source:o}=ua();return o==="CLAUDE_CODE_OAUTH_TOKEN"||o==="CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"}var p=()=>ua().source==="CCR_OAUTH_TOKEN_FILE"&&EC()&&Pl();var u=()=>NDn()&&!Qx()&&Pl()&&(d()||p());var lGn=()=>sne()&&!On()&&(L$()&&ua().source==="CLAUDE_CODE_OAUTH_TOKEN"||u());var l=()=>Jrt()||lGn();var A$s=()=>i.CLAUDE_CODE_REMOTE?"cloud-session":"signed-out";var dGn=()=>wAo([Te()!=="firstParty"&&"third-party",vr()&&"bare",_t()&&"traffic-off",!dn(K$t)&&"policy",!l()&&A$s()]);export{wAo,lGn,A$s,dGn};
