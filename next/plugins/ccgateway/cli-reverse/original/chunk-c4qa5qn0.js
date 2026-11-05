
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{qu}from"./chunk-2k62t388.js";import{lRe}from"./chunk-tzbg5px3.js";import{zh}from"./chunk-xjnnz630.js";import{E0e}from"./chunk-rfqytzvf.js";import{homedir as i}from"os";import{dirname as l,join as e}from"path";var rWe=".credentials.json",oWe=".device-keys.json";function Gyr(){return e(i(),".claude",oWe).normalize("NFC")}var aJt=".config.json",Uus=`.claude${lRe[0]}.json`,Nao=lRe.map((o)=>`.claude${o}.json`),NPi=[...Nao,aJt,rWe,oWe];function sMt(){let o=qu(),r=E0e();if(o===null||r===null)return[Gyr()];let t=l(zh());return[...Nao.map((n)=>e(t,n)),e(o,aJt),e(r,rWe),Gyr()]}
export{rWe,oWe,Gyr,aJt,Uus,Nao,NPi,sMt};
