
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Jo}from"./chunk-5ythzcas.js";import{J}from"./chunk-yxxb6qww.js";import{W}from"./chunk-0qffyy27.js";async function T5(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),J(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:a}]=await Promise.all([import("./chunk-3mv3ka1w.js"),import("./chunk-avs0pyfc.js"),import("./chunk-2r2w6xdd.js")]),i=e(),c=[r(),n(),a()];await Promise.race([Promise.all(c),J(500)]),await i}catch{}}class o{tasks=[]}var u=new W(()=>new o);function t(){return Jo(u).tasks}function _bs(s){t().push(s.catch(()=>{}))}
export{T5,_bs};
