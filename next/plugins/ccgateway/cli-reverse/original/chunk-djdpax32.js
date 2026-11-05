
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{v}from"./chunk-exfmq47h.js";import{t}from"./chunk-6hadbefe.js";import{P}from"./chunk-bb1a67wr.js";import{freemem as o}from"os";function hIo(){let e=v("tengu_bg_low_mem_mb",1024)*1024*1024;if(e<=0)return{lowMem:!1,level:void 0};if(P()!=="macos")return{lowMem:o()<e,level:void 0};let n=m();return{lowMem:n!==void 0&&n>=l,level:n}}function ixe(){return hIo().lowMem}var r={normal:1,warning:2,critical:4},l=r.critical;function m(){try{let e=Bun.ant.memoryPressureLevel();return e===null?void 0:r[e]}catch(e){t(`bg low-mem: memoryPressureLevel failed: ${e instanceof Error?e.message:String(e)}`,{level:"warn"});return}}function gIo(){return v("tengu_bg_attach_upgrade",!0)}
export{hIo,ixe,gIo};
