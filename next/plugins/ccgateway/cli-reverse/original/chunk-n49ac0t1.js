
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Up}from"./chunk-5ythzcas.js";import{ke}from"./chunk-yxxb6qww.js";import{$v}from"./chunk-ndcj3jv5.js";import{be}from"./chunk-h88kgep4.js";import{Wht,yrn}from"./chunk-m399y9ae.js";import{pC}from"./chunk-z20c443b.js";import{ba}from"./chunk-1bsktt7r.js";function Xf(r){console.error(be.red(r))}function bn(r,e="cli_error"){if(r)Xf(r);if(!Up())$v(e);process.exit(1);return}function IW(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}function EZt(r){process.exit(r);return}async function Fu(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function rN(r){process.stderr.write(be.yellow(ba(r))+`
`)}var t=2000,n=250;async function o2({waitForOAuthRefresh:r=!0}={}){let e=Wht();if(r&&!e)await yrn();await ke(pC(),t);try{let{flushAnalyticsSinks:i}=await import("./chunk-1d3tjj4q.js");await i()}catch{}if(r&&e)await yrn(),await ke(pC(),n)}async function So(r){await o2(),process.exit(r);return}async function co(r){if(r)Xf(r);return await o2(),bn()}async function eE(r){if(r)process.stdout.write(r+`
`);return await o2(),IW()}
export{Xf,bn,IW,EZt,Fu,rN,o2,So,co,eE};
