
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{yr}from"./chunk-ap4nnw1y.js";import{P}from"./chunk-bb1a67wr.js";import{fJ}from"./chunk-3yhwrhy0.js";import{Wr}from"./chunk-evj8g37g.js";import{ca}from"./chunk-89fdmwf8.js";import{Ge}from"./chunk-fmsrw1pw.js";import{Ku}from"./chunk-trds6g68.js";import n from"path";function KSn(){let r=[process.execPath],o=process.argv[1];if(!Ku()&&o)r.push(o);return r}var a="--eval-artifacts-server",VSn=["publish_version","edit_version","publish_files","create_from_type"],Dsi=["guide","get_artifact","read_artifact","list_artifacts","list_files","read_file","list_types"];function qSn(r){return r.map((o)=>Wr(ca,o))}var p=/[*?[{]/;function Lsi(r,o){let e=(o.alwaysAllowRules.cliArg??[]).flatMap((t)=>{let{toolName:s,ruleContent:i}=yr(t);return s===Ge&&i?.startsWith("//")===!0?[i.slice(1).replace(/\/\*\*$/,"")]:[]});return[r,...e.filter((t)=>!p.test(t)).map((t)=>n.posix.normalize(t).replace(/\/+$/,"")).filter((t)=>t!==""&&t!==".").map((t)=>P()==="windows"?fJ(t):t)]}function Hsi(r,o){let[e=process.execPath,...t]=KSn();return{type:"stdio",command:e,args:[...t,a,r,...o],env:{}}}
export{KSn,VSn,Dsi,qSn,Lsi,Hsi};
