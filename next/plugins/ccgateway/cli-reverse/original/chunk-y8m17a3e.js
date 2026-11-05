
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var RSr=["mcp__Claude_Preview__","mcp__Claude_Browser__","mcp__remote-devices__Claude_Browser__"];var bhs="mcp__claude-device__chrome_",hce=["mcp__claude-in-chrome__","mcp__Claude_in_Chrome__","mcp__remote-devices__claude-in-chrome__","mcp__remote-devices__Claude_in_Chrome__","mcp__claude-device__chrome_",...RSr];function r(_){if(!_.startsWith("mcp__claude-device__chrome_"))return null;let e=_.slice(27);return e===""||e.startsWith("_")||e.includes("__")?null:e}function Shs(_){let e=r(_);return e===null?_:"mcp__claude-in-chrome__"+e}function jDi(_,e){let n=r(_);return n!==null&&e==="chrome_"+n?n:e}var t=new RegExp("(?<![\\w-])mcp__claude-device__chrome_[\\w-]*","g");function eco(_){return _.replace(t,(e)=>e==="mcp__claude-device__chrome_"?"mcp__claude-in-chrome__":Shs(e))}function Bk(_){return hce.some((e)=>_.startsWith(e))}function z7t(_){return RSr.some((e)=>_.startsWith(e))}
export{RSr,bhs,hce,Shs,jDi,eco,Bk,z7t};
