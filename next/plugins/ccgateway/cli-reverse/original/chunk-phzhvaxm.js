
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ve}from"./chunk-ndmse9kj.js";import{p}from"./chunk-kpa9nk58.js";import{e5,PV}from"./chunk-2xp8150w.js";import{xV}from"./chunk-4kzs0ch0.js";import{Zje}from"./chunk-1de6ar4n.js";import{M,u,Ne,T}from"./chunk-7vp249v4.js";var i="anthropic/renderUnderSessionRules";function mji(){return{experimental:{[i]:{v:1}}}}var z=p(()=>u({experimental:u({[i]:u({v:T(1)})})}));var a=p(()=>Ne({v:T(1),permissionContext:e5(),offersHandOff:M(),classifiesEveryCall:M(),grantsApply:M()}));function Sfo(r,n,t){let e=PV(r)?void 0:a().safeParse(r).data;if(e===void 0||n===void 0)return;let{mode:s,...o}=e.permissionContext;if(!(s==="default"||s==="dontAsk"||s==="acceptEdits"||s==="auto"&&e.offersHandOff)||Object.values(o.alwaysAllowRules).some((l)=>l.length>0)||o.strippedDangerousRules!==void 0||o.additionalWorkingDirectories.$map.length>0||o.trustedNetworkDirectories!==void 0)return;return{offersHandOff:e.offersHandOff,classifiesEveryCall:e.classifiesEveryCall,toolPermissionContext:{...Zje(xV(e.permissionContext,n,ve(),t)),...!e.grantsApply&&{pollEventDeliveryGuard:!0}}}}
export{mji,Sfo};
