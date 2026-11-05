
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ae,ic}from"./chunk-gcy2kcsb.js";import{SOe}from"./chunk-5xgkngpb.js";function lGt(e,o){if(ae()||e.replMode===!0||e.sdkUrlWorker===!0){let r=require("./chunk-2jkha5en.js");return r.planCodeModeFromSession(e,o)}return{pin:void 0,switched:!1}}function dGt(e){return(o,r)=>{if(!ae()&&o.replMode===!0)SOe(lGt({replMode:!0,messages:[],source:e,sessionId:r},()=>{}))}}function jfn(e){if(SOe(e),ae()){let o=require("./chunk-2jkha5en.js");o.applyCodeModePlan(e)}}function Wfn(e,o){let r=lGt(e,o);return jfn(r),r}function _3(e=!1){if(ae()){let o=require("./chunk-2jkha5en.js");o.recordCodeMode(e)}}function _Ys(){{let e=require("./chunk-2jkha5en.js");e.recordCodeMode(!0)}}function k1r(){if(ic()){let e=require("./chunk-2jkha5en.js");return e.cloudMoveRefusal()}return}function Gfn(e){if(ae()){let o=require("./chunk-2jkha5en.js");return o.resumeSourceOfTranscriptPath(e)}return"file"}
export{lGt,dGt,jfn,Wfn,_3,_Ys,k1r,Gfn};
