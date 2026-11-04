
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ds}from"./chunk-ndmse9kj.js";import{J}from"./chunk-eabawhjj.js";import{W}from"./chunk-x7vma94a.js";async function T4(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),J(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:a}]=await Promise.all([import("./chunk-3x77zjqp.js"),import("./chunk-195bxx7h.js"),import("./chunk-vpst3pmt.js")]),i=e(),c=[r(),n(),a()];await Promise.race([Promise.all(c),J(500)]),await i}catch{}}class o{tasks=[]}var u=new W(()=>new o);function t(){return ds(u).tasks}function gts(s){t().push(s.catch(()=>{}))}
export{T4,gts};
