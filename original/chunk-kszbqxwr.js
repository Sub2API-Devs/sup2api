
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{te}from"./chunk-cgr0tezp.js";import{Ze}from"./chunk-m41h77x8.js";import{yr}from"./chunk-yxnffbzs.js";import{zIt}from"./chunk-khngy9cs.js";import{Zd}from"./chunk-v9tcvh08.js";import{Kxe}from"./chunk-5nrcp6t7.js";import{o,u}from"./chunk-7vp249v4.js";function eor(t){try{let e=new URL(t.url);return e.protocol==="https:"&&Zd(e.href)&&e.pathname===zIt}catch{return!1}}function tor(t){let{request_id:e}=Kxe(t);return e===void 0?{}:{"anthropic/requestId":e}}var c=new Set(["create","update"]);function Vii(t,e){let r=t.mcpInfo;if(r===void 0||r.scope!=="claudeai"||!c.has(r.toolName))return!1;let n=e.find((i)=>i.name===r.serverName);return n!==void 0&&n.config.scope==="claudeai"&&n.config.type==="claudeai-proxy"&&eor(n.config)}var s=65536;function z6o(t){return t.length<=s&&t.includes('"frame"')}function qii(t){for(let e of K6o(t)){if(!z6o(e))continue;let r=Ze(e,`

`),n;try{n=te(r)}catch{continue}let i=a(n);if(i!==null)return i}return null}var f=p(()=>u({frame:u({slug:o().regex(yr)})}));function a(t){let e=f().safeParse(t);return e.success?e.data.frame.slug:null}function*K6o(t){if(typeof t==="string"){yield t;return}if(!Array.isArray(t))return;for(let e of t)if(e!==null&&typeof e==="object"&&"type"in e&&e.type==="text"&&"text"in e&&typeof e.text==="string")yield e.text}
export{eor,tor,Vii,z6o,qii,K6o};
