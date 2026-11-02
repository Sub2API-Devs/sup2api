
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{posix as o}from"path";var Poe=".ccr-seed",PWs=501,IUt=o.join(Poe,"manifest.json"),S=o.join(Poe,"ready.json"),T=o.join(Poe,"laptop.json"),x=o.join(Poe,"worker.json"),Ioe=o.join(Poe,"home","pack.json"),Yyt=o.join(Poe,"home","ready.json");var f=o.join(Poe,"overlay.bundle"),s=256,i=500,_=4,c=2,l=1,r=_+c+l,e=200,E=2,A=Math.min(e,i-r-E-e),L=s-r,IWs=400;function L7e(n){let t=o.join("/",n.replaceAll("\\","/"));return t===`/${Poe}`||t.startsWith(`/${Poe}/`)}function vln(n){return!n.split("/").some((t)=>t===""||t==="."||t==="..")}var R=/^\.\.namedfork$/i;function OWs(n){return n.split("/").some((t)=>R.test(t))}
export{Poe,PWs,IUt,Ioe,Yyt,IWs,L7e,vln,OWs};
