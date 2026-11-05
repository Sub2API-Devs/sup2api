
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{Ge,gse}from"./chunk-fmsrw1pw.js";import{jc,$e}from"./chunk-m4y44r15.js";function fuo(e,n){return e!==void 0&&Number.isInteger(e)&&e>=6&&e<=n?e:6}var PQt={first:5,permissionRequestRenames:6,readAllowLarge:7,editOriginalFile:8,containerSearchTools:9,managedHookCall:10,keptBackgroundCommands:11,readCallsByToolUseId:12,repoRulesReadHere:13,repoRulesOnRenders:14,repoRulesOnUploads:15,whichCopyAsk:16,runAnswersKept:17,repoHooksListing:18,readOutputDropsFileUnchanged:19,shellDirectoryHeld:20,pluginHttpHookCall:21,hookConditionCall:22,attachedComputerPermissionRequest:23},r=Math.max(...Object.values(PQt)),d={[Ge]:{[gse]:PQt.readAllowLarge}};var dLn={version:r,min_version:fuo(void 0,r)},Dye={version:dLn.version,min_version:1},IQt=p(()=>$e({version:jc().min(1),min_version:jc().min(1)}).refine(({version:e,min_version:n})=>n<=e));function VDt(e){return IQt().safeParse(e).data}function qDt(e,n){if(n.version<e.min_version)return{kind:"peer_too_old"};return e.version<n.min_version?{kind:"self_too_old"}:{kind:"agreed",version:Math.min(e.version,n.version)}}
export{fuo,PQt,dLn,Dye,IQt,VDt,qDt};
