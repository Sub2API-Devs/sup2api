
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{Ve,Sne}from"./chunk-r2j5awry.js";import{tc,Ne}from"./chunk-7vp249v4.js";function sJr(e,n){return e!==void 0&&Number.isInteger(e)&&e>=6&&e<=n?e:6}var GYt={first:5,permissionRequestRenames:6,readAllowLarge:7,editOriginalFile:8,containerSearchTools:9,managedHookCall:10,keptBackgroundCommands:11,readCallsByToolUseId:12,repoRulesReadHere:13,repoRulesOnRenders:14,repoRulesOnUploads:15,whichCopyAsk:16,runAnswersKept:17,repoHooksListing:18},r=Math.max(...Object.values(GYt)),d={[Ve]:{[Sne]:GYt.readAllowLarge}};var lkn={version:r,min_version:sJr(void 0,r)},dkn={version:lkn.version,min_version:1},zYt=p(()=>Ne({version:tc().min(1),min_version:tc().min(1)}).refine(({version:e,min_version:n})=>n<=e));function Ulr(e){return zYt().safeParse(e).data}function Blr(e,n){if(n.version<e.min_version)return{kind:"peer_too_old"};return e.version<n.min_version?{kind:"self_too_old"}:{kind:"agreed",version:Math.min(e.version,n.version)}}
export{sJr,GYt,lkn,dkn,zYt,Ulr,Blr};
