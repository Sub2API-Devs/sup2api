
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{sp}from"./chunk-cgr0tezp.js";import{Fn}from"./chunk-gda5w2fs.js";import{I}from"./chunk-znrryf4y.js";import{B8}from"./chunk-648vry02.js";import{po}from"./chunk-6mwt0myy.js";import{wl}from"./chunk-khngy9cs.js";import{Ve}from"./chunk-r2j5awry.js";import n from"path";function wun(){let r=[process.execPath],o=process.argv[1];if(!sp()&&o)r.push(o);return r}var a="--eval-artifacts-server",Eun=["publish_version","edit_version","publish_files","create_from_type"],dKs=["guide","get_artifact","read_artifact","list_artifacts","list_files","read_file","list_types"];function vun(r){return r.map((o)=>po(wl,o))}var p=/[*?[{]/;function cKs(r,o){let e=(o.alwaysAllowRules.cliArg??[]).flatMap((t)=>{let{toolName:s,ruleContent:i}=Fn(t);return s===Ve&&i?.startsWith("//")===!0?[i.slice(1).replace(/\/\*\*$/,"")]:[]});return[r,...e.filter((t)=>!p.test(t)).map((t)=>n.posix.normalize(t).replace(/\/+$/,"")).filter((t)=>t!==""&&t!==".").map((t)=>I()==="windows"?B8(t):t)]}function uKs(r,o){let[e=process.execPath,...t]=wun();return{type:"stdio",command:e,args:[...t,a,r,...o],env:{}}}
export{wun,Eun,dKs,vun,cKs,uKs};
