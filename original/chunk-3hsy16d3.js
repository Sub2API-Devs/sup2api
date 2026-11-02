
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Oe}from"./chunk-0777tkjc.js";import{Ub,Zut}from"./chunk-c5gdqf78.js";import{Ce}from"./chunk-eabawhjj.js";import{Vt}from"./chunk-kcjh5jnz.js";import{XN}from"./chunk-j387qrdq.js";var l=1000;function V6t(e=process.argv.slice(2)){return Zut(e)&&Ub("--output-format",e)==="stream-json"}function iEe(){return Oe(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}var d=new Set(["org_config_required_unavailable","org_config_refused"]);function c(e){return d.has(e)||iEe()}function q6t(e,t=process.argv.slice(2)){let r=Ub("--session-id",t);return(Ub("--sdk-url",t)===void 0?Vt(r):r)||e}function yUe({sessionId:e,message:t,reason:r,resultIndex:n=0}){return{...XN(e,[t]),...r!==void 0&&{startup_failure_reason:r},...n!==null&&{result_index:n}}}async function I4(e){if(c(e.reason))await bat([yUe({...e,sessionId:q6t(e.sessionId)})])}async function bat(e,{goesOn:t=!1}={}){let r=process.stdout;if(!V6t()||r.writableEnded||r.destroyed)return!1;let n=e.map((o)=>JSON.stringify(o)+`
`).join(""),s=(o)=>{},u=new Promise((o)=>{s=o}),i=()=>s(!1);r.once("error",i);try{r.write(n,(o)=>s(!o))}catch{return!1}let a=await Ce(u,l)??!1;if(t&&a)r.off("error",i);return a}
export{V6t,iEe,q6t,yUe,I4,bat};
