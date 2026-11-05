
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ve}from"./chunk-5ythzcas.js";import{p}from"./chunk-k6qypy1d.js";import{a3,O4}from"./chunk-nh073evr.js";import{x4}from"./chunk-ejn7s5p2.js";import{CVe}from"./chunk-y5p93xet.js";import{O,u,$e,T}from"./chunk-m4y44r15.js";var i="anthropic/renderUnderSessionRules";function vra(){return{experimental:{[i]:{v:1}}}}var z=p(()=>u({experimental:u({[i]:u({v:T(1)})})}));var a=p(()=>$e({v:T(1),permissionContext:a3(),offersHandOff:O(),classifiesEveryCall:O(),grantsApply:O()}));function BCo(r,n,t){let e=O4(r)?void 0:a().safeParse(r).data;if(e===void 0||n===void 0)return;let{mode:s,...o}=e.permissionContext;if(!(s==="default"||s==="dontAsk"||s==="acceptEdits"||s==="auto"&&e.offersHandOff)||Object.values(o.alwaysAllowRules).some((l)=>l.length>0)||o.strippedDangerousRules!==void 0||o.additionalWorkingDirectories.$map.length>0||o.trustedNetworkDirectories!==void 0)return;return{offersHandOff:e.offersHandOff,classifiesEveryCall:e.classifiesEveryCall,toolPermissionContext:{...CVe(x4(e.permissionContext,n,ve(),t)),...!e.grantsApply&&{pollEventDeliveryGuard:!0}}}}
export{vra,BCo};
