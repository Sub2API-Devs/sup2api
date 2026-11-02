
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tm}from"./chunk-ndmse9kj.js";import{Ce}from"./chunk-eabawhjj.js";import{DE}from"./chunk-j3nx1xyn.js";import{he}from"./chunk-4ymxyb4g.js";import{Vxn}from"./chunk-tss4qggm.js";import{wI,ed}from"./chunk-dcmhvw5a.js";function fp(r){console.error(he.red(r))}function hn(r,e="cli_error"){if(r)fp(r);if(!tm())DE(e);process.exit(1);return}function D1(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}function W5t(r){process.exit(r);return}async function Rf(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function L1(r){process.stderr.write(he.yellow(ed(r))+`
`)}var i=2000;async function rG({waitForOAuthRefresh:r=!0}={}){if(r)await Vxn();await Ce(wI(),i);try{let{flushAnalyticsSinks:e}=await import("./chunk-af5wdhtv.js");await e()}catch{}}async function Ho(r){await rG(),process.exit(r);return}async function as(r){if(r)fp(r);return await rG(),hn()}async function KA(r){if(r)process.stdout.write(r+`
`);return await rG(),D1()}
export{fp,hn,D1,W5t,Rf,L1,rG,Ho,as,KA};
