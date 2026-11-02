
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Vt}from"./chunk-kcjh5jnz.js";import{i}from"./chunk-jhrww53q.js";import{hXt,YPn,zIt,Iyr,$Oe}from"./chunk-khngy9cs.js";import{Op,IQ}from"./chunk-dcmhvw5a.js";import{vue}from"./chunk-w08rdxhd.js";import{SLo}from"./chunk-9xyz2gbc.js";import{Ykt}from"./chunk-kc2qkj8w.js";import{eor}from"./chunk-kszbqxwr.js";var JDo=["Docs"],t=new Set(["claudedocs","claudepages"]);function BNr(e){return e.tier==="core"&&JDo.some((o)=>vue(e.title)===vue(o))}var ozs="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function C_t(e){return e.config.type==="claudeai-proxy"&&IQ(e.config)&&eor(e.config)||Sdn(e)||SLo()&&e.config.type==="sdk"&&Vt(e.name)!==null&&t.has($Oe(e.serverInfo?.name??""))||i.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(!Op(e.config)||eor(e.config))&&(Iyr(e.config)||hXt.has(e.name))}function Sdn(e){return e.config.type==="sdk"&&Ykt(e,{path:zIt,serverId:YPn})}function jNr(e){return e.some((o)=>(o.type==="connected"||o.type==="pending"||o.type==="cached")&&C_t(o))}
export{JDo,BNr,ozs,C_t,Sdn,jNr};
