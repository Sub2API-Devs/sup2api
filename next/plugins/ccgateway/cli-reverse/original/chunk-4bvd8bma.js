
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{mu}from"./chunk-8824h7w7.js";var vjo=255,t=255,e=/[\x00-\x20\x7f~^:?*[\\]/,o=/[\p{Cc}\p{Cf}\uFFFD]/u,i=250;function tXn(n){return Buffer.byteLength(n,"utf8")<=t&&l(n)}function l(n){return n.length<=vjo&&n!=="@"&&n!=="HEAD"&&mu(n)&&s(n)&&!o.test(n)&&!n.startsWith("-")&&n.split("/").every((r)=>Buffer.byteLength(r,"utf8")<=i)}function s(n){return!e.test(n)&&!n.endsWith(".")&&!n.includes("..")&&!n.includes("@{")&&n.split("/").every((r)=>r!==""&&!r.startsWith(".")&&!r.endsWith(".lock"))}
export{vjo,tXn};
