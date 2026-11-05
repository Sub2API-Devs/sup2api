
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{posix as o}from"path";var Iae=".ccr-seed",Jni=501,DKt=o.join(Iae,"manifest.json"),S=o.join(Iae,"ready.json"),T=o.join(Iae,"laptop.json"),x=o.join(Iae,"worker.json"),Oae=o.join(Iae,"home","pack.json"),zkt=o.join(Iae,"home","ready.json");var f=o.join(Iae,"overlay.bundle"),s=256,i=500,_=4,c=2,l=1,r=_+c+l,e=200,E=2,A=Math.min(e,i-r-E-e),L=s-r,Qni=400;function ast(n){let t=o.join("/",n.replaceAll("\\","/"));return t===`/${Iae}`||t.startsWith(`/${Iae}/`)}function h_n(n){return!n.split("/").some((t)=>t===""||t==="."||t==="..")}var R=/^\.\.namedfork$/i;function Zni(n){return n.split("/").some((t)=>R.test(t))}
export{Iae,Jni,DKt,Oae,zkt,Qni,ast,h_n,Zni};
