
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{sSo}from"./chunk-ha3km179.js";import{Lf}from"./chunk-2g090z7k.js";import{F_}from"./chunk-ndmse9kj.js";import{md}from"./chunk-gr2vfhah.js";import{cr,gu}from"./chunk-mq9v2gw5.js";import{wP,vd,De,Qo}from"./chunk-e6aww6q8.js";import{hyt}from"./chunk-0h4e7gnq.js";import{Xm}from"./chunk-j387qrdq.js";var E=/^\/btw\b/gi,M="_/btw can't run tools: any tool calls or tool output shown above were not executed and may not reflect your actual files or data. Ask in the main conversation to check._",A="(That answer wrote tool calls as text. Nothing was executed, so it is omitted here.)",b="_(This answer was cut off before it finished. Ask again to retry.)_",_="(That answer was cut off before it finished, so it is omitted here.)",k="[No result yet \u2014 this call is still in progress in the main conversation (running, awaiting approval, or queued)]";function CCr(o){let r=[],i=o.matchAll(E);for(let s of i)if(s.index!==void 0)r.push({word:s[0],start:s.index,end:s.index+s[0].length});return r}async function JHt({question:o,cacheSafeParams:r,parentController:i,onRetry:s,threadHistory:l=!0,history:a,turnInProgress:t=!0,agentId:e}){let y=i?gu(i):cr(),p=l?r.toolUseContext.session.btwHistory:null,w=(a??p?.exchanges.filter((n)=>n.agentId===e)??[]).flatMap((n)=>{let u=sSo(n.response)?A:n.response.endsWith(b)?_:n.response;return[De({content:n.question}),vd({content:n.fallbackNotice?`\u26A0 ${n.fallbackNotice}

${u}`:u})]}),h=t?x(r.forkContextMessages):void 0;try{let n=await wP({promptMessages:[...h?[h]:[],...w,De({content:[{type:"text",text:`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

IMPORTANT CONTEXT:
- You are a separate, lightweight agent spawned to answer this one question
- The main agent is NOT interrupted - it continues working independently in the background
- You share the conversation context but are a completely separate instance
- Do NOT reference being interrupted or what you were "previously doing" - that framing is incorrect

CRITICAL CONSTRAINTS:
- You have NO tools available - you cannot read files, run commands, search, or take any actions
- Do NOT write tool calls or tool output as text (for example invoke or function_calls XML blocks) - nothing you write here is executed; if answering would need reading files, running commands, or searching, say that can't be checked from a side question and suggest asking in the main conversation
- This is a one-off response - there will be no follow-up turns
- You can ONLY provide information based on what you already know from the conversation context
- NEVER say things like "Let me try...", "I'll now...", "Let me check...", or promise to take any action
- If you don't know the answer, say so - do not offer to look it up or investigate

Simply answer the question with the information you have.</system-reminder>

`},{type:"text",text:o}]})],cacheSafeParams:r,canUseTool:async()=>({behavior:"deny",message:"Side questions cannot use tools",decisionReason:{type:"other",reason:"side_question"}}),querySource:"side_question",forkLabel:"side_question",maxTurns:1,skipCacheWrite:!0,skipTranscript:!0,overrides:{abortController:y},onMessage:s?(c)=>{if(T(c))s({retryAttempt:c.retryAttempt,maxRetries:c.maxRetries,retryInMs:c.retryInMs,status:c.error.status})}:void 0}),{live:u,notice:d}=hyt(n.messages),{response:f,synthetic:m}=N(u),g=d&&{originalModel:d.originalModel,fallbackModel:d.fallbackModel,content:d.content};if(p&&f&&!m)p.append(o,f,g?.content,e);return{response:f,synthetic:m,usage:n.totalUsage,...g&&!m&&{refusalFallback:g}}}catch(n){if(n instanceof Lf||y.signal.aborted)return{response:null,synthetic:!1,usage:Xm,aborted:!0};throw n}}function x(o){let r=o.filter((t)=>!F_(t)),i=r.findLast((t)=>t.type==="assistant");if(!i)return;let s=new Set,l=[];for(let t of r)if(t.type==="user"&&Array.isArray(t.message.content)){for(let e of t.message.content)if(e.type==="tool_result")s.add(e.tool_use_id)}else if(t.type==="assistant"&&t.message.id===i.message.id){for(let e of t.message.content)if(e.type==="tool_use")l.push(e.id)}let a=l.filter((t)=>!s.has(t));if(a.length===0)return;return De({content:a.map((t)=>({type:"tool_result",tool_use_id:t,content:k})),isMeta:!0})}function N(o){let r=o.flatMap((e)=>e.type==="assistant"&&!e.isApiErrorMessage?e.message.content:[]),i=o.find((e)=>e.type==="assistant"&&e.isApiErrorMessage===!0),s=Qo(r,`

`).trim();if(s){let e=[...sSo(s)?[M]:[],...i?[b]:[]];return{response:[s,...e].join(`

`),synthetic:!1}}let l=r.find((e)=>e.type==="tool_use");if(l)return{response:`(The model tried to call ${"name"in l?l.name:"a tool"} instead of answering directly. Try rephrasing or ask in the main conversation.)`,synthetic:!0};let a=i?Qo(i.message.content,`

`).trim():"";if(a)return{response:`(API error: ${a.startsWith(`${md}: `)?a.slice(md.length+2):a})`,synthetic:!0};let t=o.find(T);if(t)return{response:`(API error: ${t.error.formatted})`,synthetic:!0};return{response:null,synthetic:!1}}function T(o){return o.type==="system"&&"subtype"in o&&o.subtype==="api_error"}
export{CCr,JHt};
