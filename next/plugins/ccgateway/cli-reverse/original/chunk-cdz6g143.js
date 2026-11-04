
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Hp}from"./chunk-cgcrer2m.js";import{ske}from"./chunk-6ysndsgz.js";import{fb}from"./chunk-jhrww53q.js";import{FOe}from"./chunk-gwwacf44.js";import{homedir as i}from"os";import{dirname as l,join as e}from"path";var V$e=".credentials.json",q$e=".device-keys.json";function bsr(){return e(i(),".claude",q$e).normalize("NFC")}var Gqt=".config.json",Z8o=`.claude${ske[0]}.json`,Z3r=ske.map((o)=>`.claude${o}.json`),xli=[...Z3r,Gqt,V$e,q$e];function jTt(){let o=Hp(),r=FOe();if(o===null||r===null)return[bsr()];let t=l(fb());return[...Z3r.map((n)=>e(t,n)),e(o,Gqt),e(r,V$e),bsr()]}
export{V$e,q$e,bsr,Gqt,Z8o,Z3r,xli,jTt};
