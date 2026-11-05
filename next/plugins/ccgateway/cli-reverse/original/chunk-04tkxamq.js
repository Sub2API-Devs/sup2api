
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Oe}from"./chunk-ndkzc8d3.js";import{NS,D_t}from"./chunk-3hvemz80.js";import{ke}from"./chunk-yxxb6qww.js";import{Ut}from"./chunk-3jnp0k38.js";import{RF}from"./chunk-0a7cfwp8.js";var l=1000;function gen(e=process.argv.slice(2)){return D_t(e)&&NS("--output-format",e)==="stream-json"}function qTe(){return Oe(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}var d=new Set(["org_config_required_unavailable","org_config_refused","config_file_invalid"]);function c(e){return d.has(e)||qTe()}function yen(e,t=process.argv.slice(2)){let r=NS("--session-id",t);return(NS("--sdk-url",t)===void 0?Ut(r):r)||e}function TGe({sessionId:e,message:t,reason:r,resultIndex:n=0}){return{...RF(e,[t]),...r!==void 0&&{startup_failure_reason:r},...n!==null&&{result_index:n}}}async function NW(e){if(c(e.reason))await emt([TGe({...e,sessionId:yen(e.sessionId)})])}async function emt(e,{goesOn:t=!1}={}){let r=process.stdout;if(!gen()||r.writableEnded||r.destroyed)return!1;let n=e.map((o)=>JSON.stringify(o)+`
`).join(""),s=(o)=>{},u=new Promise((o)=>{s=o}),i=()=>s(!1);r.once("error",i);try{r.write(n,(o)=>s(!o))}catch{return!1}let a=await ke(u,l)??!1;if(t&&a)r.off("error",i);return a}
export{gen,qTe,yen,TGe,NW,emt};
